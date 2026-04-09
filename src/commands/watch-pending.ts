import { Command } from "commander";
import { startWatchingPending } from "../core/pending-watcher.js";
import { parseInterval } from "../core/member-watcher.js";

export const watchPendingCommand = new Command("watch-pending")
  .description("Watch for pending membership requests and notify via Telegram")
  .option("-g, --group <slug>", "Skool group slug", process.env.SKOOL_GROUP)
  .option("--interval <time>", "Polling interval (e.g. 5m, 1h)", "5m")
  .option("--json", "Output events as JSON")
  .action(async (opts) => {
    if (!opts.group) {
      console.error("Group is required. Use -g <slug> or set SKOOL_GROUP env var.");
      process.exit(1);
    }

    const interval = parseInterval(opts.interval);

    await startWatchingPending({
      group: opts.group,
      interval,
      json: opts.json,
    });
  });
