import { ToolSpec } from "../tools/types.js";

export type Role = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: Role;
  content: string;
  name?: string;
}

export interface StreamChunk {
  content?: string;
  done?: boolean;
}

export interface ProviderOptions {
  model: string;
  temperature?: number;
}

export interface LLMProvider {
  name: string;
  streamChat: (
    messages: ChatMessage[],
    tools: ToolSpec[],
    options: ProviderOptions
  ) => AsyncIterable<StreamChunk>;
}
