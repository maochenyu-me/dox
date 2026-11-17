import { spawn, type ChildProcess } from "node:child_process";
import { closeSync, existsSync, openSync } from "node:fs";
import { createServer } from "node:net";
import { access, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getDoxDataDir,
  getDoxLogDir,
  getProfileForServer,
} from "@dox/core";

const HEALTH_TIMEOUT_MS = 15_000;
const HEALTH_POLL_MS = 100;

let child: ChildProcess | null = null;
let logFd: number | null = null;
let cleaned = false;

export interface RuntimeOptions {
  server?: string;
}

function explicitServer(args: string[]): string | undefined {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) continue;
    if (arg === "--server") return args[i + 1];
    if (arg.startsWith("--server=")) return arg.slice("--server=".length);
  }
  return undefined;
}

function localServerBinary(): string {
  const override = process.env.DOX_SERVER_BINARY;
  if (override) return override;
  const executableDir = dirname(process.execPath);
  const bundled = join(
    executableDir,
    process.platform === "win32" ? "dox-server.exe" : "dox-server",
  );
  if (existsSync(bundled)) return bundled;
  if (process.env.NODE_ENV !== "production") {
    const sourceRoot = dirname(
      dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))),
    );
    return process.platform === "win32"
      ? join(sourceRoot, "apps", "server", "bin", "dox-server.exe")
      : join(sourceRoot, "apps", "server", "bin", "dox-server");
  }
  return bundled;
}

async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen({ host: "127.0.0.1", port: 0 }, () => resolve());
  });
  const address = probe.address();
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  if (!address || typeof address === "string") {
    throw new Error("could not select a local port");
  }
  return address.port;
}

async function waitForHealth(
  url: string,
  processHandle: ChildProcess,
): Promise<void> {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  let lastError = "unknown error";
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error(
        `local server exited before becoming ready (code ${processHandle.exitCode})`,
      );
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 500);
    try {
      const response = await fetch(`${url}/healthz`, {
        signal: controller.signal,
      });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    } finally {
      clearTimeout(timer);
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_POLL_MS));
  }
  throw new Error(
    `local server did not become ready within 15 seconds: ${lastError}`,
  );
}

async function stopLocalServer(): Promise<void> {
  const running = child;
  child = null;
  if (!running) {
    closeLogFile();
    return;
  }
  if (running.exitCode !== null) {
    closeLogFile();
    return;
  }
  running.kill();
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      if (running.exitCode === null) running.kill("SIGKILL");
      resolve();
    }, 2_000);
    running.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
  closeLogFile();
}

function closeLogFile(): void {
  if (logFd === null) return;
  closeSync(logFd);
  logFd = null;
}

export async function startRuntime(args: string[]): Promise<RuntimeOptions> {
  const remote = explicitServer(args);
  if (remote && remote !== "local") {
    process.env.DOX_PROFILE = getProfileForServer(remote);
    delete process.env.DOX_LOCAL_MODE;
    process.env.DOX_ACTIVE_SERVER = remote;
    return { server: remote };
  }

  if (process.platform !== "win32" && !process.env.DOX_SERVER_BINARY) {
    process.env.DOX_PROFILE = "remote-legacy";
    return {};
  }

  const binary = localServerBinary();
  try {
    await access(binary);
  } catch {
    throw new Error(
      `local server binary not found at ${binary}. Put dox-server${process.platform === "win32" ? ".exe" : ""} beside dox, or set DOX_SERVER_BINARY.`,
    );
  }

  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const dataDir = getDoxDataDir();
  const logDir = getDoxLogDir();
  await mkdir(dataDir, { recursive: true });
  await mkdir(logDir, { recursive: true });
  const dbPath = join(dataDir, "dox.db");
  logFd = openSync(join(logDir, "dox-server.log"), "a");
  const running = spawn(binary, [], {
    cwd: dirname(binary),
    env: {
      ...process.env,
      DOX_LISTEN_ADDR: `127.0.0.1:${port}`,
      DOX_DB_PATH: dbPath,
    },
    stdio: ["ignore", "ignore", logFd],
    windowsHide: true,
  });
  running.once("error", (error) => {
    process.stderr.write(`dox: local server process error: ${error.message}\n`);
  });
  child = running;
  process.env.DOX_PROFILE = "local";
  process.env.DOX_LOCAL_MODE = "1";
  process.env.DOX_ACTIVE_SERVER = base;
  try {
    await waitForHealth(base, running);
  } catch (error) {
    await stopLocalServer();
    throw error;
  }
  return { server: base };
}

export async function stopRuntime(): Promise<void> {
  if (cleaned) return;
  cleaned = true;
  await stopLocalServer();
}

export function installRuntimeSignalHandlers(): void {
  const handle = (code: number) => {
    void stopRuntime().finally(() => process.exit(code));
  };
  process.once("SIGINT", () => handle(130));
  process.once("SIGTERM", () => handle(143));
  process.once("exit", () => {
    if (child && child.exitCode === null) child.kill();
  });
}

