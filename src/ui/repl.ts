import readline from "node:readline";
import { AgentRunner } from "../core/agent.js";
import { log } from "../logger.js";

export async function startRepl(
  agent: AgentRunner,
  model: string,
  maxSteps: number,
  assistantName: string
): Promise<void> {
  log.success(`${assistantName} CLI ready. Type a task, or :exit to quit.`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = async () =>
    new Promise<string>((resolve) => rl.question(`\n${assistantName}> `, resolve));

  while (true) {
    const input = (await ask()).trim();
    if (!input) continue;
    if (input === ":exit") break;
    if (input === ":help") {
      log.info("Commands: :help, :exit");
      continue;
    }

    await agent.run(input, { model, maxSteps });
  }

  rl.close();
}
