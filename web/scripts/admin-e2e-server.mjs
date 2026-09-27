// Starts the local admin against a disposable copy of src/content for browser tests.
import { cpSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";

const target = ".admin-e2e/content";
rmSync(target, { recursive: true, force: true });
cpSync("src/content", target, { recursive: true });
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", process.env.PORT || "3102"], {
  stdio: "inherit",
  env: { ...process.env, PORTFOLIO_ADMIN: "1", PORTFOLIO_CONTENT_DIR: target },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
