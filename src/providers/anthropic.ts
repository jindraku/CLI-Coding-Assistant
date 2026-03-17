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
        messages: messages.filter((m) => m.role !== "system"),
        system: messages.find((m) => m.role === "system")?.content,
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
      throw new Error(`Anthropic error: ${res.status} ${res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

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
        if (type === "content_block_delta") {
          const delta = json.delta?.text;
          if (delta) yield { content: delta };
        }
      }
    }
  }
}
