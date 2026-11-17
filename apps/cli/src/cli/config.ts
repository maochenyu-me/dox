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
        "dox: not logged in. Run 'dox register' for local mode or 'dox register --server <url>' for a remote server.",
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
    console.log(`default project cleared (${getConfigPath(cfg.profile ?? getActiveProfile())}).`);
  } else {
    console.log(`default project = ${value} (${getConfigPath(cfg.profile ?? getActiveProfile())}).`);
  }
}
