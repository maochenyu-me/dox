import { withContext, type GlobalOpts } from "./context";

export const list = (opts: GlobalOpts) =>
  withContext(opts, async ({ invites, output }) => {
    const rows = await invites.listOutgoing();
    if (rows.length === 0) {
      output.ok("（没有发出的邀请）", { invites: rows });
      return;
    }
    const lines = rows.map((r) => {
      const hash = r.codeHash.slice(0, 12);
      const expires = new Date(Number(r.expiresAt)).toISOString();
      const target = r.projectId ? `项目：${r.projectName}` : "服务器级别";
      const role = r.role === "viewer" ? "查看者" : "编辑者";
      return `${hash}…  ${role}  ${target}  过期时间：${expires}`;
    });
    output.ok(lines.join("\n"), { invites: rows });
  });

export const revoke = (codeHash: string, opts: GlobalOpts) =>
  withContext(opts, async ({ invites, output }) => {
    await invites.revoke(codeHash);
    output.ok(`已撤销邀请码 ${codeHash}`, { revoked: codeHash });
  });
