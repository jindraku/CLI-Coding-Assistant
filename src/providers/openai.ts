import { LLMProvider, ChatMessage, ProviderOptions, StreamChunk } from "./types.js";
import { ToolSpec } from "../tools/types.js";

export class OpenAIProvider implements LLMProvider {
  name = "openai";

  protected baseUrl: string;

  constructor(baseUrl = "https://api.openai.com/v1") {
    this.baseUrl = baseUrl;
  }

  async *streamChat(
    messages: ChatMessage[],
    tools: ToolSpec[],
    options: ProviderOptions
  ): AsyncIterable<StreamChunk> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const res = await this.createCompletion(apiKey, messages, tools, options);

    if (!res.ok || !res.body) {
      const details = await safeReadError(res);
      throw new Error(`OpenAI error: ${res.status} ${res.statusText}${details ? ` - ${details}` : ""}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const pendingToolCalls = new Map<number, { name: string; arguments: string }>();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) >= 0) {
        const raw = buffer.slice(0, sepIndex).trim();
        buffer = buffer.slice(sepIndex + 2);
        const lines = raw.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") {
            yield { done: true };
            continue;
          }
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta;
          if (delta?.content) {
            yield { content: delta.content };
          }
          if (Array.isArray(delta?.tool_calls)) {
            for (const toolCall of delta.tool_calls) {
              const index = Number(toolCall.index ?? 0);
              const existing = pendingToolCalls.get(index) ?? { name: "", arguments: "" };
              if (toolCall.function?.name) {
                existing.name = toolCall.function.name;
              }
              if (toolCall.function?.arguments) {
                existing.arguments += toolCall.function.arguments;
              }
              pendingToolCalls.set(index, existing);
            }
          }
        }
      }
    }

    for (const toolCall of pendingToolCalls.values()) {
      if (!toolCall.name) continue;
      const args = parseToolArguments(toolCall.arguments);
      yield { content: formatToolCall(toolCall.name, args) };
    }
  }

  protected createCompletion(
    apiKey: string,
    messages: ChatMessage[],
    tools: ToolSpec[],
    options: ProviderOptions
  ): Promise<Response> {
    const normalizedMessages = normalizeMessages(messages);

    return fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: normalizedMessages,
        temperature: options.temperature ?? 0.2,
        tools: toFunctionTools(tools),
        stream: true,
      }),
    });
  }
}

export class GroqProvider extends OpenAIProvider {
  name = "groq";

  constructor() {
    super("https://api.groq.com/openai/v1");
  }

  override async *streamChat(
    messages: ChatMessage[],
    tools: ToolSpec[],
    options: ProviderOptions
  ): AsyncIterable<StreamChunk> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set");
    }

    let res = await this.createCompletion(apiKey, messages, tools, options);

    if (!res.ok && res.status === 400 && tools.length > 0) {
      const details = await safeReadError(res);
      const retried = await this.createCompletion(apiKey, messages, [], options);
      if (retried.ok && retried.body) {
        res = retried;
      } else {
        const retryDetails = await safeReadError(retried);
        throw new Error(
          `Groq error: ${res.status} ${res.statusText}${details ? ` - ${details}` : ""}${
            retryDetails ? ` | Retry without tools failed: ${retryDetails}` : ""
          }`
        );
      }
    }

    if (!res.ok || !res.body) {
      const details = await safeReadError(res);
      throw new Error(`Groq error: ${res.status} ${res.statusText}${details ? ` - ${details}` : ""}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const pendingToolCalls = new Map<number, { name: string; arguments: string }>();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) >= 0) {
        const raw = buffer.slice(0, sepIndex).trim();
        buffer = buffer.slice(sepIndex + 2);
        const lines = raw.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") {
            yield { done: true };
            continue;
          }
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta;
          if (delta?.content) {
            yield { content: delta.content };
          }
          if (Array.isArray(delta?.tool_calls)) {
            for (const toolCall of delta.tool_calls) {
              const index = Number(toolCall.index ?? 0);
              const existing = pendingToolCalls.get(index) ?? { name: "", arguments: "" };
              if (toolCall.function?.name) {
                existing.name = toolCall.function.name;
              }
              if (toolCall.function?.arguments) {
                existing.arguments += toolCall.function.arguments;
              }
              pendingToolCalls.set(index, existing);
            }
          }
        }
      }
    }

    for (const toolCall of pendingToolCalls.values()) {
      if (!toolCall.name) continue;
      const args = parseToolArguments(toolCall.arguments);
      yield { content: formatToolCall(toolCall.name, args) };
    }
  }
}

function toFunctionTools(tools: ToolSpec[]):
  | Array<{
      type: "function";
      function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      };
    }>
  | undefined {
  return tools.length
    ? tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      }))
    : undefined;
}

async function safeReadError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.trim();
  } catch {
    return "";
  }
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
