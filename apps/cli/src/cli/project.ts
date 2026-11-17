import { withContext, type GlobalOpts } from "./context";

interface CreateOpts extends GlobalOpts {
  description?: string;
  color?: string;
}

interface InviteOpts extends GlobalOpts {
  role?: "editor" | "viewer";
}

export const list = (opts: GlobalOpts) =>
  withContext(opts, async ({ projects, output }) => {
    const rows = await projects.list();
    output.ok(
      rows
        .map(
          (p) =>
            `${p.id.slice(0, 8)}  ${p.archived ? "[archived] " : ""}${p.name}`,
        )
        .join("\n") || "(no projects)",
      { projects: rows },
    );
  });

export const create = (name: string, opts: CreateOpts) =>
  withContext(opts, async ({ projects, output }) => {
    const p = await projects.create({
      name,
      description: opts.description,
      color: opts.color,
    });
    output.ok(`已创建项目 ${p.name}（${p.id.slice(0, 8)}）`, { project: p });
  });

export const rename = (id: string, name: string, opts: GlobalOpts) =>
  withContext(opts, async ({ projects, output }) => {
    const p = await projects.update(id, { name });
    output.ok(`已重命名为“${p.name}”`, { project: p });
  });

export const archive = (id: string, opts: GlobalOpts) =>
  withContext(opts, async ({ projects, output }) => {
    const p = await projects.update(id, { archived: true });
    output.ok(`已归档项目 ${p.name}`, { project: p });
  });

export const unarchive = (id: string, opts: GlobalOpts) =>
  withContext(opts, async ({ projects, output }) => {
    const p = await projects.update(id, { archived: false });
    output.ok(`已取消归档项目 ${p.name}`, { project: p });
  });

export const remove = (id: string, opts: GlobalOpts) =>
  withContext(opts, async ({ projects, output }) => {
    await projects.remove(id);
    output.ok(`已删除项目 ${id}`, { deleted: id });
  });

export const invite = (id: string, opts: InviteOpts) =>
  withContext(opts, async ({ invites, output }) => {
    const role = opts.role ?? "editor";
    const inv = await invites.create({ projectId: id, role });
    output.ok(
      `邀请码：${inv.code}\n角色：    ${inv.role}\n项目：    ${inv.projectId}\n过期时间：${new Date(Number(inv.expiresAt)).toISOString()}`,
      { invite: inv },
    );
  });

export const members = (id: string, opts: GlobalOpts) =>
  withContext(opts, async ({ projects, output }) => {
    const rows = await projects.listMembers(id);
    output.ok(
      rows.map((m) => `${m.userId}  ${m.role}`).join("\n") ||
        "（没有其他成员，仅所有者）",
      { members: rows },
    );
  });

export const removeMember = (
  projectId: string,
  userId: string,
  opts: GlobalOpts,
) =>
  withContext(opts, async ({ projects, output }) => {
    await projects.removeMember(projectId, userId);
    output.ok(`已从项目 ${projectId} 移除成员 ${userId}`, {
      removed: userId,
    });
  });
