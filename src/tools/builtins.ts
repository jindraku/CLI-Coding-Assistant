import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ToolHandler, ToolResult } from "./types.js";

const execFileAsync = promisify(execFile);

function truncate(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars) + `\n...truncated ${content.length - maxChars} chars`;
}

export function createBuiltinTools(cwd: string): ToolHandler[] {
  const readFile: ToolHandler = {
    spec: {
      name: "fs_read",
      description: "Read a text file from disk.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
    handle: async (args) => {
      const filePath = path.resolve(cwd, String(args.path));
      const content = fs.readFileSync(filePath, "utf8");
      return { content };
    },
  };

  const writeFile: ToolHandler = {
    spec: {
      name: "fs_write",
      description: "Write a text file to disk, creating parent folders if needed.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"],
      },
    },
    handle: async (args) => {
      const filePath = path.resolve(cwd, String(args.path));
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, String(args.content), "utf8");
      return { content: `Wrote ${filePath}` };
    },
  };

  const listDir: ToolHandler = {
    spec: {
      name: "fs_list",
      description: "List files and folders in a directory.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
    handle: async (args) => {
      const dirPath = path.resolve(cwd, String(args.path));
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const lines = entries.map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name));
      return { content: lines.join("\n") };
    },
  };

  const search: ToolHandler = {
    spec: {
      name: "fs_search",
      description: "Search for a pattern in files under a path.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          path: { type: "string" },
        },
        required: ["query", "path"],
      },
    },
    handle: async (args) => {
      const searchPath = path.resolve(cwd, String(args.path));
      const query = String(args.query);
      try {
        const { stdout } = await execFileAsync("rg", ["-n", query, searchPath]);
        return { content: stdout || "" };
      } catch (err: any) {
        const stderr = err?.stderr ? String(err.stderr) : "";
        const stdout = err?.stdout ? String(err.stdout) : "";
        if (err?.code === "ENOENT") {
          return { content: "rg not available in PATH" };
        }
        return { content: stdout || stderr || "No matches" };
      }
    },
  };

  const shell: ToolHandler = {
    spec: {
      name: "shell",
      description: "Run a shell command and return its output.",
      inputSchema: {
        type: "object",
        properties: {
          command: { type: "string" },
          cwd: { type: "string" },
          maxChars: { type: "number" },
        },
        required: ["command"],
      },
    },
    handle: async (args) => {
      const command = String(args.command);
      const workdir = args.cwd ? path.resolve(cwd, String(args.cwd)) : cwd;
      const maxChars = args.maxChars ? Number(args.maxChars) : 8000;
      const { stdout, stderr } = await execFileAsync("/bin/sh", ["-c", command], {
        cwd: workdir,
        maxBuffer: 10 * 1024 * 1024,
      });
      const output = `${stdout}${stderr ? `\n${stderr}` : ""}`.trim();
      return { content: truncate(output, maxChars) || "(no output)" };
    },
  };

  return [readFile, writeFile, listDir, search, shell];
}
