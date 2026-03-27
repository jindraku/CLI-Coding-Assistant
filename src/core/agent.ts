import { ChatMessage, LLMProvider } from "../providers/types.js";
import { ToolExecutor } from "../tools/executor.js";
import { ToolRegistry } from "../tools/registry.js";
import { ToolCall, ToolSpec } from "../tools/types.js";
import { TerminalUI } from "../ui/terminal.js";

const TOOL_CALL_OPEN = "<tool_call>";
const TOOL_CALL_CLOSE = "</tool_call>";

export interface AgentOptions {
  maxSteps: number;
  model: string;
  history?: ChatMessage[];
}

export class AgentRunner {
  constructor(
    private provider: LLMProvider,
    private registry: ToolRegistry,
    private executor: ToolExecutor,
    private systemPrompt: string,
    private ui: TerminalUI
  ) {}

  async run(task: string, options: AgentOptions): Promise<ChatMessage[]> {
    const toolCatalog = buildToolCatalog(this.registry);
    const history = options.history ?? [];
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          this.systemPrompt +
          `\n\nAvailable tools:\n${toolCatalog}\n\nUse tool calls with the format ${TOOL_CALL_OPEN}{"name":"tool","args":{...}}${TOOL_CALL_CLOSE}.`,
      },
      ...history,
      { role: "user", content: task },
    ];
    const sessionMessages: ChatMessage[] = [{ role: "user", content: task }];

    for (let step = 0; step < options.maxSteps; step += 1) {
      this.ui.printStep(step + 1, options.maxSteps);
      const assistant = await this.generate(messages, options.model);
      this.ui.endAssistantResponse();
      messages.push({ role: "assistant", content: assistant });
      sessionMessages.push({ role: "assistant", content: assistant });

      const toolCalls = extractToolCalls(assistant);
      if (toolCalls.length === 0) {
        return sessionMessages;
      }

      for (const call of toolCalls) {
        this.ui.printToolCall(call.name, call.args);
        const result = await this.executor.run(call);
        this.ui.printToolResult(call.name, result.content.slice(0, 4000));
        messages.push({
          role: "tool",
          name: call.name,
          content: result.content,
        });
        sessionMessages.push({
          role: "tool",
          name: call.name,
          content: result.content,
        });
      }
    }

    this.ui.printWarn("Max steps reached without completion.");
    return sessionMessages;
  }

  private async generate(messages: ChatMessage[], model: string): Promise<string> {
    const toolSpecs: ToolSpec[] = this.registry.listSpecs();
    let full = "";

    try {
      for await (const chunk of this.provider.streamChat(messages, toolSpecs, { model })) {
        if (chunk.content) {
          this.ui.printAssistantText(chunk.content);
          full += chunk.content;
        }
      }
    } catch (err) {
      this.ui.printError(err instanceof Error ? err.message : String(err));
    }

    return full;
  }
}

function extractToolCalls(text: string): ToolCall[] {
  const calls: ToolCall[] = [];
  let start = 0;

  while (true) {
    const openIndex = text.indexOf(TOOL_CALL_OPEN, start);
    if (openIndex === -1) break;
    const closeIndex = text.indexOf(TOOL_CALL_CLOSE, openIndex + TOOL_CALL_OPEN.length);
    if (closeIndex === -1) break;

    const payload = text.slice(openIndex + TOOL_CALL_OPEN.length, closeIndex).trim();
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      const normalized = normalizeToolCall(parsed);
      if (normalized) {
        calls.push(normalized);
      }
    } catch {
      // ignore invalid tool call
    }

    start = closeIndex + TOOL_CALL_CLOSE.length;
  }

  return calls;
}

function normalizeToolCall(payload: Record<string, unknown>): ToolCall | null {
  const name = typeof payload.name === "string" ? payload.name : null;
  if (!name) {
    return null;
  }

  if (isRecord(payload.args)) {
    return { name, args: payload.args };
  }

  if (isRecord(payload.parameters)) {
    return { name, args: unwrapParameterValues(payload.parameters) };
  }

  return { name, args: {} };
}

function unwrapParameterValues(parameters: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(parameters)) {
    if (isRecord(value) && "value" in value) {
      result[key] = value.value;
    } else {
      result[key] = value;
    }
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildToolCatalog(registry: ToolRegistry): string {
  return registry
    .listSpecs()
    .map((tool) => `- ${tool.name}: ${tool.description}`)
    .join("\n");
}
