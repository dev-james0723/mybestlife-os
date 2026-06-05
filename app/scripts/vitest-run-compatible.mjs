import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rawArgs = process.argv.slice(2);
const args = [];

for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];

  // Codex/Jest-style validation often invokes `npm test -- --watchAll=false`.
  // Vitest `run` is already non-watch, so drop only that compatibility flag.
  if (arg === "--watchAll=false" || arg === "--watchAll=0") continue;
  if (arg === "--watchAll" && rawArgs[i + 1] === "false") {
    i += 1;
    continue;
  }

  args.push(arg);
}

const vitestEntry = fileURLToPath(
  new URL("../node_modules/vitest/vitest.mjs", import.meta.url),
);

const child = spawn(process.execPath, [vitestEntry, "run", ...args], {
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
