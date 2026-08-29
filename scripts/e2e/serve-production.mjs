import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const nextCli = path.resolve("node_modules", "next", "dist", "bin", "next");
const build = spawnSync(process.execPath, [nextCli, "build"], {
  env: process.env,
  stdio: "inherit",
});

if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawn(
  process.execPath,
  [nextCli, "start", "--hostname", "127.0.0.1", "--port", "3100"],
  { env: process.env, stdio: "inherit" },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code) => process.exit(code ?? 0));
