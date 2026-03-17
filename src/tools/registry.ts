import { ToolHandler, ToolSpec } from "./types.js";

export class ToolRegistry {
  private handlers = new Map<string, ToolHandler>();

  register(handler: ToolHandler): void {
    this.handlers.set(handler.spec.name, handler);
  }

  listSpecs(): ToolSpec[] {
    return Array.from(this.handlers.values()).map((h) => h.spec);
  }

  has(name: string): boolean {
    return this.handlers.has(name);
  }

  get(name: string): ToolHandler {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return handler;
  }
}
