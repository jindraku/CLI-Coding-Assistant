import chalk from "chalk";

export const log = {
  info: (msg: string) => console.log(chalk.cyan(msg)),
  warn: (msg: string) => console.log(chalk.yellow(msg)),
  error: (msg: string) => console.log(chalk.red(msg)),
  success: (msg: string) => console.log(chalk.green(msg)),
  subtle: (msg: string) => console.log(chalk.gray(msg)),
};
