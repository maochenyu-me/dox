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
      "dox：Windows 本地版本以外的环境必须指定 --server <url>。",
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
    console.error(`dox：服务器地址无效：${input}`);
    process.exit(1);
  }
}

async function promptText(
  message: string,
  placeholder?: string,
): Promise<string> {
  const v = await p.text({ message, placeholder });
  if (p.isCancel(v)) {
    p.cancel("已取消");
    process.exit(1);
  }
  return v;
}

async function promptPassword(message: string): Promise<string> {
  const v = await p.password({ message });
  if (p.isCancel(v)) {
    p.cancel("已取消");
    process.exit(1);
  }
  return v;
}

export async function loginCmd(opts: LoginOptions): Promise<void> {
  const url = validUrlOrDie(serverOrLocal(opts.server));
  p.intro(`登录到 ${url.origin}`);
  const userName = opts.name ?? (await promptText("用户名：", "alice"));
  const password = opts.password ?? (await promptPassword("密码："));
  let result;
  try {
    result = await login(url.origin, { userName, password });
  } catch (err) {
    p.cancel(`登录失败：${(err as Error).message}`);
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
  p.outro(`已以 ${result.userName}（${roleLabel(result.role)}）登录，配置已保存。`);
}

export async function registerCmd(opts: RegisterOptions): Promise<void> {
  const url = validUrlOrDie(serverOrLocal(opts.server));
  p.intro(`在 ${url.origin} 注册账户`);
  const userName = opts.name ?? (await promptText("用户名：", "alice"));
  const password =
    opts.password ?? (await promptPassword("密码（至少 8 个字符）："));
  let invite = opts.invite;
  if (!invite) {
    const ans = await p.text({
      message:
        "邀请码（如果你是首位用户或服务器已开放注册，可留空）：",
    });
    if (p.isCancel(ans)) {
      p.cancel("已取消");
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
    p.cancel(`注册失败：${(err as Error).message}`);
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
  p.outro(`已为 ${result.userName}（${roleLabel(result.role)}）创建账户，配置已保存。`);
}

export async function acceptInviteCmd(
  codeArg: string,
  opts: AcceptOptions,
): Promise<void> {
  const profile = opts.server ? getProfileForServer(opts.server) : undefined;
  const cfg = await loadConfig(profile);
  if (cfg) {
    p.intro(`以 ${cfg.userName} 的身份接受邀请`);
    const fetcher = buildFetcher(cfg, realIO());
    try {
      const res = await acceptInvite(fetcher, cfg.server, codeArg);
      p.outro(`已加入项目 ${res.projectId}，角色：${roleLabel(res.role)}。`);
    } catch (err) {
      p.cancel(`接受邀请失败：${(err as Error).message}`);
      process.exit(1);
    }
    return;
  }
  const server =
    opts.server ??
    process.env.DOX_ACTIVE_SERVER ??
     (await promptText("服务器地址：", "http://127.0.0.1:6278"));
  try {
    await fetchServerInfo(server);
  } catch (err) {
    p.cancel(`无法连接服务器：${(err as Error).message}`);
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
    console.error("dox：尚未登录。本地模式请运行 'dox login'，连接远程服务器请运行 'dox login --server <url>'。");
    process.exit(1);
  }
  const oldPassword = opts.old ?? (await promptPassword("当前密码："));
  const newPassword =
    opts.new ?? (await promptPassword("新密码（至少 8 个字符）："));
  const fetcher = buildFetcher(cfg, realIO());
  const users = new UserClient(fetcher, cfg.server);
  try {
    await users.changePassword(oldPassword, newPassword);
  } catch (err) {
    console.error(`dox：${(err as Error).message}`);
    process.exit(1);
  }
  console.log("密码已修改。");
}

function roleLabel(role: string): string {
  if (role === "owner") return "所有者";
  if (role === "editor") return "编辑者";
  if (role === "viewer") return "查看者";
  return role;
}
