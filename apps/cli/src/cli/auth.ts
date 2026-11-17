import * as p from "@clack/prompts";

import {
  acceptInvite,
  buildFetcher,
  clearConfig,
  fetchServerInfo,
  getActiveProfile,
  getConfigPath,
  getProfileForServer,
  loadConfig,
  login,
  realIO,
  register,
  saveConfig,
  UserClient,
} from "@dox/core";

import type { GlobalOpts } from "./context";

interface LoginOptions {
  server?: string;
  name?: string;
  password?: string;
}

interface RegisterOptions {
  server?: string;
  name?: string;
  password?: string;
  invite?: string;
}

const LOCAL_SERVER = "http://127.0.0.1:6278";

function serverOrLocal(server?: string): string {
  if (server) return server;
  if (process.env.DOX_ACTIVE_SERVER) return process.env.DOX_ACTIVE_SERVER;
  if (process.platform !== "win32") {
    console.error(
      "dox: --server <url> is required outside the Windows local package.",
    );
    process.exit(1);
  }
  return LOCAL_SERVER;
}

interface AcceptOptions extends GlobalOpts {
  server?: string;
}

interface PasswdOptions extends GlobalOpts {
  old?: string;
  new?: string;
}

function validUrlOrDie(input: string): URL {
  try {
    return new URL(input);
  } catch {
    console.error(`dox: invalid server URL: ${input}`);
    process.exit(1);
  }
}

async function promptText(
  message: string,
  placeholder?: string,
): Promise<string> {
  const v = await p.text({ message, placeholder });
  if (p.isCancel(v)) {
    p.cancel("Cancelled");
    process.exit(1);
  }
  return v;
}

async function promptPassword(message: string): Promise<string> {
  const v = await p.password({ message });
  if (p.isCancel(v)) {
    p.cancel("Cancelled");
    process.exit(1);
  }
  return v;
}

export async function loginCmd(opts: LoginOptions): Promise<void> {
  const url = validUrlOrDie(serverOrLocal(opts.server));
  p.intro(`Log in to ${url.origin}`);
  const userName = opts.name ?? (await promptText("Username:", "alice"));
  const password = opts.password ?? (await promptPassword("Password:"));
  let result;
  try {
    result = await login(url.origin, { userName, password });
  } catch (err) {
    p.cancel(`Login failed: ${(err as Error).message}`);
    process.exit(1);
  }
  await saveConfig({
    server: url.origin,
    token: result.token,
    userId: result.userId,
    userName: result.userName,
    role: result.role,
    profile:
      process.env.DOX_LOCAL_MODE === "1"
        ? "local"
        : getProfileForServer(url.origin),
  });
  p.outro(`Logged in as ${result.userName} (${result.role}). Config saved.`);
}

export async function registerCmd(opts: RegisterOptions): Promise<void> {
  const url = validUrlOrDie(serverOrLocal(opts.server));
  p.intro(`Register with ${url.origin}`);
  const userName = opts.name ?? (await promptText("Username:", "alice"));
  const password =
    opts.password ?? (await promptPassword("Password (min 8 chars):"));
  let invite = opts.invite;
  if (!invite) {
    const ans = await p.text({
      message:
        "Invite code (leave empty if you're the first user or open registration is on):",
    });
    if (p.isCancel(ans)) {
      p.cancel("Cancelled");
      process.exit(1);
    }
    invite = ans || undefined;
  }
  let result;
  try {
    result = await register(url.origin, {
      userName,
      password,
      inviteCode: invite,
    });
  } catch (err) {
    p.cancel(`Register failed: ${(err as Error).message}`);
    process.exit(1);
  }
  await saveConfig({
    server: url.origin,
    token: result.token,
    userId: result.userId,
    userName: result.userName,
    role: result.role,
    profile:
      process.env.DOX_LOCAL_MODE === "1"
        ? "local"
        : getProfileForServer(url.origin),
  });
  p.outro(`Registered as ${result.userName} (${result.role}). Config saved.`);
}

export async function acceptInviteCmd(
  codeArg: string,
  opts: AcceptOptions,
): Promise<void> {
  const profile = opts.server ? getProfileForServer(opts.server) : undefined;
  const cfg = await loadConfig(profile);
  if (cfg) {
    p.intro(`Accept invite as ${cfg.userName}`);
    const fetcher = buildFetcher(cfg, realIO());
    try {
      const res = await acceptInvite(fetcher, cfg.server, codeArg);
      p.outro(`Joined project ${res.projectId} as ${res.role}.`);
    } catch (err) {
      p.cancel(`Accept failed: ${(err as Error).message}`);
      process.exit(1);
    }
    return;
  }
  const server =
    opts.server ??
    process.env.DOX_ACTIVE_SERVER ??
    (await promptText("Server URL:", "http://127.0.0.1:6278"));
  try {
    await fetchServerInfo(server);
  } catch (err) {
    p.cancel(`Cannot reach server: ${(err as Error).message}`);
    process.exit(1);
  }
  await registerCmd({
    ...(process.env.DOX_LOCAL_MODE === "1" ? {} : { server }),
    invite: codeArg,
  });
}

export async function logoutCmd(opts: GlobalOpts = {}): Promise<void> {
  const profile = opts.server ? getProfileForServer(opts.server) : undefined;
  const removed = await clearConfig(profile);
  if (removed) {
    console.log(`已退出登录，已移除 ${getConfigPath(profile ?? getActiveProfile())}。`);
  } else {
    console.log("没有可移除的配置，当前已是退出状态。");
  }
}

export async function passwdCmd(opts: PasswdOptions): Promise<void> {
  const profile = opts.server ? getProfileForServer(opts.server) : undefined;
  const cfg = await loadConfig(profile);
  if (!cfg) {
    console.error("dox: not logged in. Run 'dox login' for local mode or 'dox login --server <url>' for a remote server.");
    process.exit(1);
  }
  const oldPassword = opts.old ?? (await promptPassword("Current password:"));
  const newPassword =
    opts.new ?? (await promptPassword("New password (min 8 chars):"));
  const fetcher = buildFetcher(cfg, realIO());
  const users = new UserClient(fetcher, cfg.server);
  try {
    await users.changePassword(oldPassword, newPassword);
  } catch (err) {
    console.error(`dox: ${(err as Error).message}`);
    process.exit(1);
  }
  console.log("密码已修改。");
}
