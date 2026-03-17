export type ToolArgs = Record<string, unknown>;

export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  name: string;
  args: ToolArgs;
}

export interface ToolResult {
  content: string;
}

export interface ToolHandler {
  spec: ToolSpec;
  handle: (args: ToolArgs) => Promise<ToolResult>;
}
