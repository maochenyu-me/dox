import type { ReactNode } from "react";

import type { OutgoingInvite, ServerSettings } from "@dox/core";

import type { SettingsTabKey } from "./state";

export interface SettingsRow {
  key: string;
  label: string;
  value?: string;
  detail?: ReactNode;
  onEnter?: () => void;
  enterLabel?: string;
  secondary?: { key: string; label: string; action: () => void };
  muted?: boolean;
}

export interface SettingsTabSpec {
  key: SettingsTabKey;
  label: string;
  hint?: string;
  rows: SettingsRow[];
  hints?: ReadonlyArray<readonly [string, string]>;
}

export interface BuildSettingsArgs {
  identity: { userName?: string; server?: string; role?: string };
  server: ServerSettings | null;
  serverLoaded: boolean;
  outgoing: OutgoingInvite[];
  outgoingLoaded: boolean;
  on: {
    editServerName: () => void;
    editServerDescription: () => void;
    toggleRegistration: (next: boolean) => void;
    changePassword: () => void;
    signOut: () => void;
    redeemCode: () => void;
    revokeInvite: (codeHash: string) => void;
  };
}

const isOwner = (role?: string) => role === "owner";

function fmtExpiry(expiresAtMs: string): string {
  const ms = Number(expiresAtMs);
  if (!Number.isFinite(ms)) return "—";
  const delta = ms - Date.now();
  if (delta <= 0) return "已过期";
  const hours = Math.floor(delta / 3_600_000);
  if (hours >= 24) return `${Math.floor(hours / 24)}天后过期`;
  if (hours >= 1) return `${hours}小时后过期`;
  const mins = Math.max(1, Math.floor(delta / 60_000));
  return `${mins}分钟后过期`;
}

function inviteSummary(inv: OutgoingInvite): string {
  if (!inv.projectId) return "服务器邀请码";
  const name = inv.projectName || "（项目已删除）";
  return `${name} · ${inv.role || "editor"}`;
}

export function buildServerTab(args: BuildSettingsArgs): SettingsTabSpec {
  const owner = isOwner(args.identity.role);
  const s = args.server;
  const rows: SettingsRow[] = [
    {
      key: "name",
      label: "服务器名称",
      value: s?.serverName || (args.serverLoaded ? "（未设置）" : "加载中…"),
      detail:
        "服务器的友好名称，会显示在欢迎界面。",
      onEnter: owner ? args.on.editServerName : undefined,
      enterLabel: "edit",
      muted: !s?.serverName,
    },
    {
      key: "description",
      label: "描述",
      value:
        s?.serverDescription || (args.serverLoaded ? "（未设置）" : "加载中…"),
      detail:
        "服务器简介，帮助新成员了解即将加入的服务器。",
      onEnter: owner ? args.on.editServerDescription : undefined,
      enterLabel: "edit",
      muted: !s?.serverDescription,
    },
  ];
  if (owner) {
    rows.push({
      key: "registration",
      label: "开放注册",
      value: s ? (s.registrationOpen ? "true" : "false") : "loading…",
      detail:
        "开启后，任何拥有服务器地址的人都可以注册；关闭后，新用户需要你的邀请码。",
      onEnter: s
        ? () => args.on.toggleRegistration(!s.registrationOpen)
        : undefined,
      enterLabel: "toggle",
    });
  }
  return {
    key: "server",
    label: "服务器",
    hint: owner
      ? "服务器信息和设置。你是所有者。"
      : "仅可查看，只有所有者可以修改。",
    rows,
    hints: owner
      ? [
          ["⏎", "编辑"],
          ["1/2/3", "tab"],
          ["esc", "关闭"],
        ]
      : [
          ["1/2/3", "tab"],
          ["esc", "关闭"],
        ],
  };
}

export function buildAccountTab(args: BuildSettingsArgs): SettingsTabSpec {
  const rows: SettingsRow[] = [
    {
      key: "user",
      label: "当前用户",
      value: args.identity.userName || "—",
      detail:
        "当前登录账户。如需更换账户，请退出后重新登录。",
    },
    {
      key: "server-url",
      label: "服务器地址",
      value: args.identity.server || "—",
      detail: "当前连接的 dox 服务器。",
    },
    {
      key: "role",
      label: "角色",
      value: args.identity.role || "—",
      detail:
        "所有者可以修改服务器设置并邀请成员，普通成员不能。",
    },
    {
      key: "change-password",
      label: "修改密码…",
      detail:
        "设置新密码。需要输入当前密码和新密码（至少 8 个字符）。",
      onEnter: args.on.changePassword,
      enterLabel: "change",
    },
    {
      key: "sign-out",
      label: "退出登录",
      detail:
        "退出此设备登录。账户不会被删除，之后可以随时重新登录。",
      onEnter: args.on.signOut,
      enterLabel: "sign out",
    },
  ];
  return {
    key: "account",
    label: "账户",
    rows,
    hints: [
      ["⏎", "打开"],
      ["1/2/3", "tab"],
      ["esc", "关闭"],
    ],
  };
}

export function buildInvitesTab(args: BuildSettingsArgs): SettingsTabSpec {
  const inviteRows: SettingsRow[] = args.outgoing.map((inv) => ({
    key: `inv-${inv.codeHash}`,
    label: inviteSummary(inv),
    value: fmtExpiry(inv.expiresAt),
    detail: inv.projectId
      ? `加入项目 ${inv.projectName || "（项目已删除）"}，角色：${inv.role || "editor"}。${fmtExpiry(inv.expiresAt)}。`
      : `注册邀请码，任何拥有此邀请码的人都可以在此服务器创建账户。${fmtExpiry(inv.expiresAt)}。`,
    secondary: {
      key: "r",
      label: "撤销",
      action: () => args.on.revokeInvite(inv.codeHash),
    },
  }));
  const rows: SettingsRow[] = [
    ...inviteRows,
    {
      key: "redeem",
      label: "兑换邀请码…",
      detail: "粘贴他人分享的邀请码以加入项目。",
      onEnter: args.on.redeemCode,
      enterLabel: "redeem",
    },
  ];
  return {
    key: "invites",
    label: "邀请",
    hint: args.outgoingLoaded
      ? args.outgoing.length === 0
        ? "你还没有分享过邀请码。请在项目页面创建邀请码。"
        : `有 ${args.outgoing.length} 个有效邀请。`
      : "正在加载邀请…",
    rows,
    hints: [
      ["⏎", "redeem"],
      ["r", "撤销"],
      ["1/2/3", "tab"],
      ["esc", "关闭"],
    ],
  };
}

export function buildSettingsTabs(args: BuildSettingsArgs): SettingsTabSpec[] {
  return [buildServerTab(args), buildAccountTab(args), buildInvitesTab(args)];
}
