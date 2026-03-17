import readline from "node:readline";
import { AgentRunner } from "../core/agent.js";
import { ChatMessage } from "../providers/types.js";
import { SessionStore, SavedSession } from "./sessions.js";
import { HeaderInfo, TerminalUI } from "./terminal.js";

interface ReplOptions {
  model: string;
  maxSteps: number;
  header: HeaderInfo;
  sessionStore: SessionStore;
  ui: TerminalUI;
}

export async function startRepl(agent: AgentRunner, options: ReplOptions): Promise<void> {
  const { model, maxSteps, header, sessionStore, ui } = options;

  ui.renderRecentSessions(sessionStore.formatRecent());

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  let activeSession = await chooseSession(rl, sessionStore, ui);
  let history = normalizeHistory(activeSession);

  if (activeSession) {
    ui.printInfo(`Resumed session ${activeSession.id}`);
  } else {
    ui.printInfo("Starting new session");
    activeSession = sessionStore.create("New session");
  }

  while (true) {
    const input = (await ask(rl, `\n${header.assistantName}> `)).trim();
    if (!input) continue;
    if (input === ":exit") break;
    if (input === ":help") {
      ui.printInfo("Commands: :help, :exit, :new");
      continue;
    }
    if (input === ":new") {
      activeSession = sessionStore.create("New session");
      history = [];
      ui.printInfo("Started a new session");
      continue;
    }

    ui.printPromptEcho(input);
    const newMessages = await agent.run(input, { model, maxSteps, history });
    history = [...history, ...newMessages];
    activeSession = sessionStore.append(activeSession.id, newMessages, input);
  }

  rl.close();
}

async function chooseSession(
  rl: readline.Interface,
  sessionStore: SessionStore,
  ui: TerminalUI
): Promise<SavedSession | undefined> {
  const recent = sessionStore.listRecent();
  if (recent.length === 0) {
    return undefined;
  }

  const answer = (await ask(rl, "\nResume session (number or N): ")).trim();
  if (!answer || answer.toLowerCase() === "n") {
    return undefined;
  }

  const index = Number(answer) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= recent.length) {
    ui.printWarn("Invalid session selection. Starting a new session.");
    return undefined;
  }

  return recent[index];
}

function normalizeHistory(session?: SavedSession): ChatMessage[] {
  if (!session) {
    return [];
  }

  return session.messages.filter((message) => message.role !== "system");
}

function ask(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise<string>((resolve) => rl.question(prompt, resolve));
}
