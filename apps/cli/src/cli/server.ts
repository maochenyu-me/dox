import { withContext, type GlobalOpts } from "./context";

interface InviteOpts extends GlobalOpts {
  ttlMs?: number;
}

export const me = (opts: GlobalOpts) =>
  withContext(opts, async ({ users, output }) => {
    const u = await users.me();
    const role = u.role === "owner" ? "所有者" : u.role === "viewer" ? "查看者" : "编辑者";
    output.ok(`${u.name}（${role}）  id=${u.id}`, { user: u });
  });

export const listUsers = (opts: GlobalOpts) =>
  withContext(opts, async ({ users, output }) => {
    const rows = await users.list();
    output.ok(
      rows
        .map((u) => {
          const role = u.role === "owner" ? "所有者" : u.role === "viewer" ? "查看者" : "编辑者";
          return `${u.id.slice(0, 8)}  ${role}  ${u.name}`;
        })
        .join("\n") || "（没有用户）",
      { users: rows },
    );
  });

export const inviteServer = (opts: InviteOpts) =>
  withContext(opts, async ({ invites, output }) => {
    const inv = await invites.create({ ttlMs: opts.ttlMs });
    output.ok(
      `服务器邀请码：${inv.code}\n过期时间：    ${new Date(Number(inv.expiresAt)).toISOString()}\n使用命令：    dox accept ${inv.code}`,
      { invite: inv },
    );
  });

export const setRegistrationOpen = (value: string, opts: GlobalOpts) =>
  withContext(opts, async ({ users, output }) => {
    const open = value === "true" || value === "1";
    const s = await users.updateSettings({ registrationOpen: open });
    output.ok(`开放注册：${s.registrationOpen ? "已开启" : "已关闭"}`, { settings: s });
  });

export const setServerName = (name: string, opts: GlobalOpts) =>
  withContext(opts, async ({ users, output }) => {
    const s = await users.updateSettings({ serverName: name });
    output.ok(`服务器名称：${s.serverName || "（空）"}`, { settings: s });
  });

export const setServerDescription = (desc: string, opts: GlobalOpts) =>
  withContext(opts, async ({ users, output }) => {
    const s = await users.updateSettings({ serverDescription: desc });
    output.ok(`服务器描述：${s.serverDescription || "（空）"}`, {
      settings: s,
    });
  });

export const resetUserPassword = (userName: string, opts: GlobalOpts) =>
  withContext(opts, async ({ users, output }) => {
    const all = await users.list();
    const target = all.find((u) => u.name === userName);
    if (!target) {
      output.error(`未找到用户：${userName}`);
      process.exit(1);
    }
    const { tempPassword } = await users.resetUserPassword(target.id);
    output.ok(
      `已重置用户 ${userName} 的密码。\n临时密码：${tempPassword}\n请通过其他方式转交，用户首次登录后应运行 \`dox passwd\` 修改密码。`,
      { userName, tempPassword },
    );
  });
