import { LLMProvider, ChatMessage, ProviderOptions, StreamChunk } from "./types.js";
import { ToolSpec } from "../tools/types.js";

export class AnthropicProvider implements LLMProvider {
  name = "anthropic";

  async *streamChat(
    messages: ChatMessage[],
    tools: ToolSpec[],
    options: ProviderOptions
  ): AsyncIterable<StreamChunk> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }

    const normalizedMessages = normalizeMessages(messages);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: options.model,
        max_tokens: 1024,
        messages: normalizedMessages.filter((m) => m.role !== "system"),
        system: normalizedMessages.find((m) => m.role === "system")?.content,
        tools: tools.length
          ? tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              input_schema: tool.inputSchema,
            }))
          : undefined,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      const details = await safeReadError(res);
      throw new Error(`Anthropic error: ${res.status} ${res.statusText}${details ? ` - ${details}` : ""}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let activeToolUse:
      | {
          id: string;
          name: string;
          input: string;
        }
      | undefined;
    const completedToolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line || !line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") {
          yield { done: true };
          continue;
        }
        const json = JSON.parse(data);
        const type = json.type;
        if (type === "content_block_start" && json.content_block?.type === "tool_use") {
          activeToolUse = {
            id: json.content_block.id,
            name: json.content_block.name,
            input: "",
          };
        }
        if (type === "content_block_delta") {
          const delta = json.delta?.text;
          if (delta) yield { content: delta };
          const partialJson = json.delta?.partial_json;
          if (activeToolUse && partialJson) {
            activeToolUse.input += partialJson;
          }
        }
        if (type === "content_block_stop" && activeToolUse) {
          completedToolCalls.push({
            name: activeToolUse.name,
            args: parseToolArguments(activeToolUse.input),
          });
          activeToolUse = undefined;
        }
      }
    }

    for (const toolCall of completedToolCalls) {
      yield { content: formatToolCall(toolCall.name, toolCall.args) };
    }
  }
}

async function safeReadError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.trim();
  } catch {
    return "";
  }
}

function parseToolArguments(raw: string): Record<string, unknown> {
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { raw };
  }
}

function formatToolCall(name: string, args: Record<string, unknown>): string {
  return `<tool_call>${JSON.stringify({ name, args })}</tool_call>`;
}

function normalizeMessages(messages: ChatMessage[]): Array<{
  role: "system" | "user" | "assistant";
  content: string;
}> {
  return messages.map((message) => {
    if (message.role === "tool") {
      return {
        role: "user",
        content: `Tool result from ${message.name ?? "tool"}:\n${message.content}`,
      };
    }

    return {
      role: message.role,
      content: message.content,
    };
  });
}
