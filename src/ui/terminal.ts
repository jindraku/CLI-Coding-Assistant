import chalk from "chalk";

export interface HeaderInfo {
  assistantName: string;
  workspace: string;
  provider: string;
  model: string;
  version: string;
}

export class TerminalUI {
  private width: number;

  constructor() {
    this.width = Math.max(88, Math.min(process.stdout.columns || 120, 140));
  }

  renderHeader(info: HeaderInfo): void {
    const logo = [
      "  ______                    ____  _ _       _   ",
      " |  ____|                  |  _ \\(_) |     | |  ",
      " | |__ ___  _ __ __ _  ___ | |_) |_| | ___ | |_ ",
      " |  __/ _ \\| '__/ _` |/ _ \\|  __/| | |/ _ \\| __|",
      " | | | (_) | | | (_| |  __/| |   | | | (_) | |_ ",
      " |_|  \\___/|_|  \\__, |\\___||_|   |_|_|\\___/ \\__|",
      "                 __/ |                          ",
      "                |___/                           ",
    ];

    const meta = [
      this.metaLine("Workspace", info.workspace),
      this.metaLine("Provider", info.provider),
      this.metaLine("Model", info.model),
      this.metaLine("Version", info.version, chalk.cyanBright),
    ];

    this.printBox([
      ...logo.map((line) => chalk.cyanBright(line)),
      "",
      ...meta,
    ]);
  }

  renderRecentSessions(lines: string[]): void {
    this.printSection("Recent sessions:");
    if (lines.length === 0) {
      console.log(chalk.gray("No previous sessions"));
      return;
    }

    for (const line of lines) {
      console.log(line);
    }
  }

  printSection(title: string): void {
    console.log("");
    console.log(chalk.whiteBright(title));
  }

  printPromptEcho(input: string): void {
    console.log("");
    console.log(chalk.whiteBright(`> ${input}`));
  }

  printAssistantText(text: string): void {
    process.stdout.write(chalk.white(text));
  }

  endAssistantResponse(): void {
    process.stdout.write("\n");
  }

  printStep(step: number, total: number): void {
    console.log("");
    console.log(chalk.gray(`[step ${step}/${total}]`));
  }

  printToolCall(name: string, args: Record<string, unknown>): void {
    const argLines = Object.keys(args).length
      ? Object.entries(args).map(([key, value]) => `${chalk.gray(key)}  ${formatValue(value)}`)
      : [chalk.gray("no arguments")];

    const header = `${chalk.cyanBright(symbol("tool"))} ${chalk.cyanBright(name)}`;
    this.printBox([header, ...argLines], chalk.cyanBright);
  }

  printToolResult(name: string, content: string): void {
    const body = truncateLines(content, 12);
    const lines = body.length > 0 ? body.split("\n") : ["(no output)"];
    const title = `${chalk.gray(symbol("result"))} ${chalk.gray(name)} result`;
    this.printBox([title, ...lines.map((line) => chalk.gray(line))], chalk.gray);
  }

  printInfo(msg: string): void {
    console.log(chalk.cyan(msg));
  }

  printSuccess(msg: string): void {
    console.log(chalk.green(msg));
  }

  printWarn(msg: string): void {
    console.log(chalk.yellow(msg));
  }

  printError(msg: string): void {
    console.log(chalk.red(msg));
  }

  printSubtle(msg: string): void {
    console.log(chalk.gray(msg));
  }

  private metaLine(label: string, value: string, color = chalk.whiteBright): string {
    return `${chalk.whiteBright(label.padEnd(10))} : ${color(value)}`;
  }

  private printBox(lines: string[], accent: (value: string) => string = chalk.cyanBright): void {
    const innerWidth = this.width - 4;
    const top = accent("+" + "-".repeat(innerWidth + 2) + "+");
    const bottom = top;
    console.log(top);
    for (const line of lines) {
      const wrapped = wrapAnsi(line, innerWidth);
      for (const part of wrapped) {
        const pad = Math.max(0, innerWidth - visibleLength(part));
        console.log(accent("|") + " " + part + " ".repeat(pad) + " " + accent("|"));
      }
    }
    console.log(bottom);
  }
}

function wrapAnsi(text: string, width: number): string[] {
  if (visibleLength(text) <= width) {
    return [text];
  }

  const plain = stripAnsi(text);
  const words = plain.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [plain];
}

function visibleLength(text: string): number {
  return stripAnsi(text).length;
}

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function truncateLines(text: string, maxLines: number): string {
  const lines = text.split("\n");
  if (lines.length <= maxLines) {
    return text;
  }
  return `${lines.slice(0, maxLines).join("\n")}\n...truncated ${lines.length - maxLines} lines`;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

function symbol(type: "tool" | "result"): string {
  return type === "tool" ? ">>" : "->";
}
