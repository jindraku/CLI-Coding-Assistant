import "dotenv/config";
import { Command } from "commander";
import { loadConfig, resolvePath } from "./config.js";
import { createProvider } from "./providers/provider-factory.js";
import { ToolRegistry } from "./tools/registry.js";
import { createBuiltinTools } from "./tools/builtins.js";
import { ToolExecutor } from "./tools/executor.js";
import { MCPManager } from "./mcp/client.js";
import { AgentRunner } from "./core/agent.js";
import { startRepl } from "./ui/repl.js";
import { log } from "./logger.js";

const program = new Command();

program
  .name("forgepilot")
  .description("Agentic CLI coding assistant")
  .option("-c, --config <path>", "Config file path")
  .option("-m, --model <model>", "Model override")
  .option("-p, --provider <provider>", "Provider override")
  .option("--auto", "Auto-execute tools without confirmation")
  .option("--once <task>", "Run a single task and exit")
  .option("--max-steps <n>", "Maximum tool-usage steps", "12");

program.parse(process.argv);

const opts = program.opts();
const cwd = process.cwd();
const config = loadConfig(cwd, opts.config);
const providerName = opts.provider ?? config.provider;
const model = opts.model ?? config.model;
const maxSteps = Number(opts.maxSteps ?? config.maxSteps);
const autoExecute = Boolean(opts.auto ?? config.autoExecute);

const provider = createProvider(providerName);
const registry = new ToolRegistry();
const executor = new ToolExecutor(registry, !autoExecute);
const agent = new AgentRunner(provider, registry, executor, config.systemPrompt);

const mcpManager = new MCPManager();

async function boot(): Promise<void> {
  log.info(`Using provider ${providerName} with model ${model}`);

  for (const tool of createBuiltinTools(cwd)) {
    registry.register(tool);
  }

  const mcpPath = resolvePath(cwd, config.mcpServersPath);
  try {
    const mcpTools = await mcpManager.loadServers(mcpPath);
    for (const tool of mcpTools) {
      registry.register(tool);
    }
  } catch (err) {
    log.warn(`MCP server load failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (opts.once) {
    await agent.run(String(opts.once), { model, maxSteps });
  } else {
    await startRepl(agent, model, maxSteps, config.assistantName);
  }
}

boot()
  .catch((err) => {
    log.error(err instanceof Error ? err.message : String(err));
  })
  .finally(async () => {
    await mcpManager.close();
  });
