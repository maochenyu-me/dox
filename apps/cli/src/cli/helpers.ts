import { readFile } from "node:fs/promises";

import { localZone, parseWhen } from "@dox/core";

export function FormatCodeOnNewline(code: string): string {
  if (code.length !== 8) return code;
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export async function readDescription(opts: {
  description?: string;
  descriptionFile?: string;
}): Promise<string | undefined> {
  if (opts.description !== undefined && opts.descriptionFile !== undefined) {
    throw new Error("--description 和 --description-file 不能同时使用");
  }
  if (opts.description !== undefined) return opts.description;
  if (opts.descriptionFile === undefined) return undefined;
  if (opts.descriptionFile === "-") return readStdin();
  return readFile(opts.descriptionFile, "utf-8");
}

async function readStdin(): Promise<string> {
  let data = "";
  process.stdin.setEncoding("utf-8");
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

export interface DueInput {
  at: number;
  allDay: boolean;
}

/**
 * Parses a --due / --remind value, failing loudly on gibberish. Examples:
 * 2026-11-05 (all-day), "2026-11-05 09:30", 09:30, +2h.
 */
export function parseFlagWhen(raw: string, flag: string): DueInput {
  const parsed = parseWhen(raw);
  if (!parsed) {
    throw new Error(
      `${flag} 时间格式无效：“${raw}”。示例：2026-11-05、"2026-11-05 09:30"、09:30 或 +2h`,
    );
  }
  return parsed;
}

/**
 * Deadline fields for create/update. An all-day deadline pins the caller's zone
 * so other members render the same calendar day; switching back to an exact
 * instant clears that zone ("" is the server's clear sentinel).
 */
export function dueFields(when: DueInput): {
  dueAt: number;
  dueAllDay: boolean;
  dueZone: string;
} {
  return {
    dueAt: when.at,
    dueAllDay: when.allDay,
    dueZone: when.allDay ? localZone() : "",
  };
}
