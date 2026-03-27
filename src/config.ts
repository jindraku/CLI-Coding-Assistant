import fs from "node:fs";
import path from "node:path";

export interface AssistantConfig {
  assistantName: string;
  provider: "ollama" | "openai" | "anthropic" | "groq";
  model: string;
  providerModels?: Partial<Record<"ollama" | "openai" | "anthropic" | "groq", string>>;
  autoExecute: boolean;
  maxSteps: number;
  systemPrompt: string;
  mcpServersPath: string;
  rag: {
    dbPath: string;
    chunkSize: number;
    chunkOverlap: number;
  };
}

const DEFAULT_CONFIG_PATH = path.join("config", "default.json");

export function loadConfig(cwd: string, overridePath?: string): AssistantConfig {
  const configPath = overridePath
    ? path.resolve(cwd, overridePath)
    : path.resolve(cwd, DEFAULT_CONFIG_PATH);

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw) as AssistantConfig;
  return parsed;
}

export function resolvePath(cwd: string, maybeRelative: string): string {
  if (path.isAbsolute(maybeRelative)) {
    return maybeRelative;
  }
  return path.resolve(cwd, maybeRelative);
}
