import {
  getActiveProfile,
  getConfigPath,
  getProfileForServer,
  loadConfig,
  saveConfig,
  type Config,
  type Profile,
} from "@dox/core";

import type { GlobalOpts } from "./context";

function loadOrExit(server?: string): Promise<Config> {
  const profile = server ? getProfileForServer(server) : undefined;
  return loadConfig(profile).then((cfg) => {
    if (!cfg) {
      console.error(
        "dox：尚未登录。本地模式请运行 'dox register'，连接远程服务器请运行 'dox register --server <url>'。",
      );
      process.exit(1);
    }
    return cfg;
  });
}

export async function setDefaultProject(
  value: string,
  _opts: GlobalOpts,
): Promise<void> {
  const cfg = await loadOrExit(_opts.server);
  const clear = value === "" || value === "none" || value === "clear";
  cfg.defaultProject = clear ? undefined : value;
  await saveConfig(cfg);
  if (clear) {
    console.log(`已清除默认项目（${getConfigPath(cfg.profile ?? getActiveProfile())}）。`);
  } else {
    console.log(`默认项目已设为 ${value}（${getConfigPath(cfg.profile ?? getActiveProfile())}）。`);
  }
}
