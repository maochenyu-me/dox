import { existsSync } from "node:fs";
import {
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";

import * as toml from "@iarna/toml";

export interface Config {
  server: string;
  token: string;
  userId: string;
  userName: string;
  role: string;
  defaultProject?: string;
  /** "local" or a remote profile key. Older configs omit this field. */
  profile?: Profile;
}

export type Profile = "local" | "remote-legacy" | `remote-${string}`;

const isWindows = platform() === "win32";

function rootDir(): string {
  if (process.env.DOX_CONFIG_DIR) return process.env.DOX_CONFIG_DIR;
  if (isWindows) {
    return join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "dox");
  }
  return join(homedir(), ".config", "dox");
}

const profilesDir = () => join(rootDir(), "profiles");
const localPath = () => join(profilesDir(), "local.toml");
const legacyPaths = () => [
  join(rootDir(), "config.toml"),
  join(homedir(), ".config", "dox", "config.toml"),
];

function activeProfile(): Profile {
  const value = process.env.DOX_PROFILE;
  if (!value) return isWindows ? "local" : "remote-legacy";
  if (value === "local") return "local";
  return value.startsWith("remote-") ? (value as Profile) : `remote-${value}`;
}

function profilePath(profile: Profile): string {
  if (profile === "local") return localPath();
  if (!isWindows && profile === "remote-legacy") {
    return join(rootDir(), "config.toml");
  }
  return join(profilesDir(), `${profile}.toml`);
}

function pickString(parsed: Record<string, unknown>, key: string): string {
  const v = parsed[key];
  return typeof v === "string" ? v : "";
}

function profileForServer(server: string): Profile {
  if (server === "local") return "local";
  let identity = server;
  try {
    identity = new URL(server).origin;
  } catch {
    // Keep the original value so malformed URLs still produce a stable profile key.
  }
  let value = identity
    .replace(/^https?:\/\//, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-");
  value = value.replace(/^-+|-+$/g, "").slice(0, 80) || "server";
  return `remote-${value}`;
}

async function migrateLegacyConfig(): Promise<void> {
  if (!isWindows) return;
  const old = legacyPaths().find((candidate) => existsSync(candidate));
  if (!old) return;
  const parsed = toml.parse(await readFile(old, "utf-8")) as Record<string, unknown>;
  if (typeof parsed.server !== "string" || parsed.server === "local") return;
  const profile = profilePath(profileForServer(parsed.server));
  if (existsSync(profile)) return;
  await mkdir(dirname(profile), { recursive: true });
  await rename(old, profile);
}

export async function loadConfig(profile: Profile = activeProfile()): Promise<Config | null> {
  await migrateLegacyConfig();
  const path = profilePath(profile);
  if (!existsSync(path)) return null;

  const raw = await readFile(path, "utf-8");
  const parsed = toml.parse(raw) as Record<string, unknown>;
  if (typeof parsed.server !== "string" || typeof parsed.token !== "string") {
    throw new Error(`malformed config at ${path}: 'server' and 'token' are required`);
  }
  const ui = (parsed.ui as Record<string, unknown> | undefined) ?? {};
  const savedServer = parsed.server;
  return {
    server:
      profile === "local"
        ? process.env.DOX_ACTIVE_SERVER || savedServer
        : savedServer,
    token: parsed.token,
    userId: pickString(parsed, "user_id"),
    userName: pickString(parsed, "user_name"),
    role: pickString(parsed, "role"),
    defaultProject:
      typeof ui.default_project === "string" ? ui.default_project : undefined,
    profile,
  };
}

export async function saveConfig(cfg: Config): Promise<void> {
  const profile = (cfg.profile as Profile | undefined) || activeProfile();
  const path = profilePath(profile);
  await mkdir(profilesDir(), { recursive: true, mode: 0o700 });
  const body: Record<string, unknown> = {
    // A local port is ephemeral. Keep only a marker on disk.
    server: profile === "local" ? "local" : cfg.server,
    token: cfg.token,
    user_id: cfg.userId,
    user_name: cfg.userName,
    role: cfg.role,
  };
  if (cfg.defaultProject) body.ui = { default_project: cfg.defaultProject };
  const raw = toml.stringify(body as toml.JsonMap);
  await writeFile(path, raw, { mode: 0o600 });
  await chmod(path, 0o600);
}

export async function clearConfig(profile: Profile = activeProfile()): Promise<boolean> {
  const path = profilePath(profile);
  if (!existsSync(path)) return false;
  await rm(path, { force: true });
  return true;
}

export function getConfigPath(profile: Profile = activeProfile()): string {
  return profilePath(profile);
}

export function getDoxDataDir(): string {
  return join(rootDir(), "data");
}

export function getDoxLogDir(): string {
  return join(rootDir(), "logs");
}

export function getActiveProfile(): Profile {
  return activeProfile();
}

export function getProfileForServer(server: string): Profile {
  return profileForServer(server);
}
