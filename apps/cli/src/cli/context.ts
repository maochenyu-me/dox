import {
  HumanOutput,
  InviteClient,
  JsonOutput,
  NotificationClient,
  type Output,
  ProjectClient,
  TodoClient,
  UserClient,
  buildFetcher,
  getProfileForServer,
  loadConfig,
  realIO,
} from "@dox/core";

export interface CliContext {
  api: TodoClient;
  projects: ProjectClient;
  users: UserClient;
  invites: InviteClient;
  notifications: NotificationClient;
  output: Output;
  server: string;
  userName: string;
  role: string;
  defaultProject?: string;
}

export interface GlobalOpts {
  json?: boolean;
  server?: string;
}

async function buildContext(opts: GlobalOpts): Promise<CliContext> {
  const io = realIO();
  const profile = opts.server ? getProfileForServer(opts.server) : undefined;
  const cfg = await loadConfig(profile);
  if (!cfg) {
    io.stderr.write(
      "dox：尚未登录。本地模式请运行 'dox register'，连接远程服务器请运行 'dox register --server <url>'。\n",
    );
    process.exit(1);
  }
  const fetcher = buildFetcher(cfg, io);
  return {
    api: new TodoClient(fetcher, cfg.server),
    projects: new ProjectClient(fetcher, cfg.server),
    users: new UserClient(fetcher, cfg.server),
    invites: new InviteClient(fetcher, cfg.server),
    notifications: new NotificationClient(fetcher, cfg.server),
    output: opts.json ? new JsonOutput(io) : new HumanOutput(io),
    server: cfg.server,
    userName: cfg.userName,
    role: cfg.role,
    defaultProject: cfg.defaultProject,
  };
}

export async function withContext(
  opts: GlobalOpts,
  fn: (ctx: CliContext) => Promise<void>,
): Promise<void> {
  const ctx = await buildContext(opts);
  try {
    await fn(ctx);
  } catch (err) {
    ctx.output.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
