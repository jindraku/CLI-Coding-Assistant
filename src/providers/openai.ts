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

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        temperature: options.temperature ?? 0.2,
        tools: tools.length
          ? tools.map((tool) => ({
              type: "function",
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema,
              },
            }))
          : undefined,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`OpenAI error: ${res.status} ${res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

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
        }
      }
    }
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

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        temperature: options.temperature ?? 0.2,
        tools: tools.length
          ? tools.map((tool) => ({
              type: "function",
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema,
              },
            }))
          : undefined,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Groq error: ${res.status} ${res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

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
        }
      }
    }
  }
}
