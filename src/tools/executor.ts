import readline from "node:readline";
import { ToolRegistry } from "./registry.js";
import { ToolCall, ToolResult } from "./types.js";
import { log } from "../logger.js";

export class ToolExecutor {
  constructor(
    private registry: ToolRegistry,
    private confirmBeforeRun: boolean
  ) {}

  async run(call: ToolCall): Promise<ToolResult> {
    if (!this.registry.has(call.name)) {
      throw new Error(`Tool not found: ${call.name}`);
    }

    if (this.confirmBeforeRun) {
      const ok = await this.confirm(call);
      if (!ok) {
        return { content: "Tool execution skipped by user." };
      }
    }

    const handler = this.registry.get(call.name);
    return handler.handle(call.args);
  }

  private async confirm(call: ToolCall): Promise<boolean> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((resolve) =>
      rl.question(`Allow tool ${call.name} with args ${JSON.stringify(call.args)}? (y/N) `, resolve)
    );
    rl.close();

    const normalized = answer.trim().toLowerCase();
    const ok = normalized === "y" || normalized === "yes";
    if (!ok) {
      log.warn(`Denied tool call: ${call.name}`);
    }
    return ok;
  }
}
