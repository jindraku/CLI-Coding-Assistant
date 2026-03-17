import { ChatMessage, LLMProvider } from "../providers/types.js";
import { ToolExecutor } from "../tools/executor.js";
import { ToolRegistry } from "../tools/registry.js";
import { ToolCall } from "../tools/types.js";
import { log } from "../logger.js";

const TOOL_CALL_OPEN = "<tool_call>";
const TOOL_CALL_CLOSE = "</tool_call>";

export interface AgentOptions {
  maxSteps: number;
  model: string;
}

export class AgentRunner {
  constructor(
    private provider: LLMProvider,
    private registry: ToolRegistry,
    private executor: ToolExecutor,
    private systemPrompt: string
  ) {}

  async run(task: string, options: AgentOptions): Promise<void> {
    const toolCatalog = buildToolCatalog(this.registry);
    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          this.systemPrompt +
          `\n\nAvailable tools:\n${toolCatalog}\n\nUse tool calls with the format ${TOOL_CALL_OPEN}{"name":"tool","args":{...}}${TOOL_CALL_CLOSE}.`,
      },
      { role: "user", content: task },
    ];

    for (let step = 0; step < options.maxSteps; step += 1) {
      log.subtle(`\n[step ${step + 1}/${options.maxSteps}]`);
      const assistant = await this.generate(messages, options.model);
      messages.push({ role: "assistant", content: assistant });

      const toolCalls = extractToolCalls(assistant);
      if (toolCalls.length === 0) {
        return;
      }

      for (const call of toolCalls) {
        log.info(`[tool] ${call.name} ${JSON.stringify(call.args)}`);
        const result = await this.executor.run(call);
        log.subtle(`[tool result] ${result.content.slice(0, 4000)}`);
        messages.push({
          role: "tool",
          name: call.name,
          content: result.content,
        });
      }
    }

    log.warn("Max steps reached without completion.");
  }

  private async generate(messages: ChatMessage[], model: string): Promise<string> {
    const toolSpecs = [];
    let full = "";

    try {
      for await (const chunk of this.provider.streamChat(messages, toolSpecs, { model })) {
        if (chunk.content) {
          process.stdout.write(chunk.content);
          full += chunk.content;
        }
      }
    } catch (err) {
      log.error(err instanceof Error ? err.message : String(err));
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
      const parsed = JSON.parse(payload) as ToolCall;
      if (parsed?.name) {
        calls.push({ name: parsed.name, args: parsed.args ?? {} });
      }
    } catch {
      // ignore invalid tool call
    }

    start = closeIndex + TOOL_CALL_CLOSE.length;
  }

  return calls;
}

function buildToolCatalog(registry: ToolRegistry): string {
  return registry
    .listSpecs()
    .map((tool) => `- ${tool.name}: ${tool.description}`)
    .join("\n");
}
