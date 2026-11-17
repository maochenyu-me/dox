#!/usr/bin/env bun

import { mkdirSync } from "node:fs";

const version = process.env.DOX_CLI_VERSION ?? process.env.SERVER_VERSION ?? "dev";
const commit = process.env.DOX_CLI_COMMIT ?? detectCommit();
const output = "dist/windows-amd64/dox.exe";

function detectCommit(): string {
  const proc = Bun.spawnSync(["git", "rev-parse", "--short=12", "HEAD"]);
  if (proc.exitCode !== 0) return "unknown";
  return proc.stdout.toString().trim() || "unknown";
}

const stubReactDevtoolsCore = {
  name: "stub-react-devtools-core",
  setup(builder: {
    onResolve: (
      options: { filter: RegExp },
      callback: () => { path: string; namespace: string },
    ) => void;
    onLoad: (
      options: { filter: RegExp; namespace: string },
      callback: () => { contents: string; loader: "js" },
    ) => void;
  }) {
    builder.onResolve({ filter: /^react-devtools-core$/ }, () => ({
      path: "stub",
      namespace: "stub-react-devtools",
    }));
    builder.onLoad(
      { filter: /.*/, namespace: "stub-react-devtools" },
      () => ({ contents: "export default {};", loader: "js" }),
    );
  },
};

mkdirSync("dist/windows-amd64", { recursive: true });
const result = await Bun.build({
  entrypoints: ["apps/cli/src/index.ts"],
  target: "bun-windows-x64",
  compile: { outfile: output },
  define: {
    "process.env.DOX_CLI_VERSION": JSON.stringify(version),
    "process.env.DOX_CLI_COMMIT": JSON.stringify(commit),
  },
  plugins: [stubReactDevtoolsCore],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.log(`>>> built ${output} (${version} ${commit})`);
