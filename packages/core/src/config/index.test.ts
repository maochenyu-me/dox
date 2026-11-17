import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

import {
  getProfileForServer,
  loadConfig,
  saveConfig,
  type Config,
} from "./index";

describe("config profiles", () => {
  it("uses separate stable profiles for local and remote servers", async () => {
    const root = await mkdtemp(join(tmpdir(), "dox-config-"));
    const previousConfigDir = process.env.DOX_CONFIG_DIR;
    const previousProfile = process.env.DOX_PROFILE;
    const previousActiveServer = process.env.DOX_ACTIVE_SERVER;
    process.env.DOX_CONFIG_DIR = root;
    process.env.DOX_PROFILE = "local";
    process.env.DOX_ACTIVE_SERVER = "http://127.0.0.1:49152";

    const local: Config = {
      server: process.env.DOX_ACTIVE_SERVER,
      token: "local-token",
      userId: "local-user",
      userName: "alice",
      role: "owner",
      profile: "local",
    };
    await saveConfig(local);

    const remoteProfile = getProfileForServer("https://example.com/team");
    expect(remoteProfile).toBe("remote-example.com");
    await saveConfig({
      ...local,
      server: "https://example.com",
      token: "remote-token",
      profile: remoteProfile,
    });

    const localRaw = await readFile(join(root, "profiles", "local.toml"), "utf8");
    expect(localRaw).toContain('server = "local"');
    expect(localRaw).toContain('token = "local-token"');
    expect(existsSync(join(root, "profiles", "remote-example.com.toml"))).toBe(true);

    const loaded = await loadConfig("local");
    expect(loaded?.server).toBe("http://127.0.0.1:49152");
    expect((await loadConfig(remoteProfile))?.server).toBe("https://example.com");

    if (previousConfigDir === undefined) delete process.env.DOX_CONFIG_DIR;
    else process.env.DOX_CONFIG_DIR = previousConfigDir;
    if (previousProfile === undefined) delete process.env.DOX_PROFILE;
    else process.env.DOX_PROFILE = previousProfile;
    if (previousActiveServer === undefined) delete process.env.DOX_ACTIVE_SERVER;
    else process.env.DOX_ACTIVE_SERVER = previousActiveServer;
    await rm(root, { recursive: true, force: true });
  });

  it("migrates the legacy remote config into a profile", async () => {
    const root = await mkdtemp(join(tmpdir(), "dox-config-"));
    const previousConfigDir = process.env.DOX_CONFIG_DIR;
    const previousProfile = process.env.DOX_PROFILE;
    process.env.DOX_CONFIG_DIR = root;
    delete process.env.DOX_PROFILE;
    await mkdir(join(root, "profiles"), { recursive: true });
    await writeFile(
      join(root, "config.toml"),
      'server = "https://legacy.example"\ntoken = "token"\n',
    );

    const loaded = await loadConfig();
    if (process.platform === "win32") {
      expect(loaded).toBeNull();
      expect(existsSync(join(root, "profiles", "remote-legacy.example.toml"))).toBe(true);
      expect(existsSync(join(root, "config.toml"))).toBe(false);
    } else {
      expect(loaded?.server).toBe("https://legacy.example");
      expect(existsSync(join(root, "config.toml"))).toBe(true);
    }
    if (process.platform === "win32") {
      expect((await loadConfig("remote-legacy.example"))?.server).toBe(
        "https://legacy.example",
      );
    }

    if (previousConfigDir === undefined) delete process.env.DOX_CONFIG_DIR;
    else process.env.DOX_CONFIG_DIR = previousConfigDir;
    if (previousProfile === undefined) delete process.env.DOX_PROFILE;
    else process.env.DOX_PROFILE = previousProfile;
    await rm(root, { recursive: true, force: true });
  });
});
