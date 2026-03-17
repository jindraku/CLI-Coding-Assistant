import fs from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ToolHandler, ToolSpec } from "../tools/types.js";

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled?: boolean;
}

export interface MCPConfigFile {
  servers: MCPServerConfig[];
}

export class MCPManager {
  private clients: Client[] = [];

  async loadServers(configPath: string): Promise<ToolHandler[]> {
    if (!fs.existsSync(configPath)) {
      return [];
    }

    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as MCPConfigFile;
    const handlers: ToolHandler[] = [];

    for (const server of parsed.servers) {
      if (server.enabled === false) continue;
      const transport = new StdioClientTransport({
        command: server.command,
        args: server.args ?? [],
        env: { ...process.env, ...(server.env ?? {}) },
      });

      const client = new Client(
        { name: "forgepilot", version: "0.1.0" },
        { capabilities: { tools: {} } }
      );

      await client.connect(transport);
      this.clients.push(client);

      const toolList = await client.listTools();
      for (const tool of toolList.tools) {
        const prefixedName = tool.name.startsWith(`${server.name}.`)
          ? tool.name
          : `${server.name}.${tool.name}`;
        const spec: ToolSpec = {
          name: prefixedName,
          description: tool.description || "",
          inputSchema: tool.inputSchema || { type: "object" },
        };

        handlers.push({
          spec,
          handle: async (args) => {
            const result = await client.callTool({
              name: tool.name,
              arguments: args,
            });

            const parts = result.content
              .map((part: any) => (part.text ? part.text : JSON.stringify(part)))
              .join("\n");

            return { content: parts };
          },
        });
      }
    }

    return handlers;
  }

  async close(): Promise<void> {
    await Promise.all(this.clients.map((client) => client.close()));
    this.clients = [];
  }
}
