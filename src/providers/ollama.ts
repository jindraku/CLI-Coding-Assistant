import { LLMProvider, ChatMessage, ProviderOptions, StreamChunk } from "./types.js";
import { ToolSpec } from "../tools/types.js";

export class OllamaProvider implements LLMProvider {
  name = "ollama";

  async *streamChat(
    messages: ChatMessage[],
    _tools: ToolSpec[],
    options: ProviderOptions
  ): AsyncIterable<StreamChunk> {
    let res: Response;
    try {
      res = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: options.model,
          messages,
          stream: true,
        }),
      });
    } catch (err: any) {
      const hint =
        "Failed to reach Ollama at http://localhost:11434. Start Ollama with `ollama serve` or switch providers.";
      throw new Error(`${hint} (${err?.message ?? "unknown error"})`);
    }

    if (!res.ok || !res.body) {
      throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
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
        if (!line) continue;
        const chunk = JSON.parse(line);
        if (chunk?.message?.content) {
          yield { content: chunk.message.content };
        }
        if (chunk?.done) {
          yield { done: true };
        }
      }
    }
  }
}
