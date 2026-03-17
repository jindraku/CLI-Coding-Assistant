import { LLMProvider } from "./types.js";
import { OllamaProvider } from "./ollama.js";
import { OpenAIProvider, GroqProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";

export function createProvider(name: string): LLMProvider {
  switch (name) {
    case "ollama":
      return new OllamaProvider();
    case "openai":
      return new OpenAIProvider();
    case "groq":
      return new GroqProvider();
    case "anthropic":
      return new AnthropicProvider();
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
