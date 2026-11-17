import { Box, Text, useInput } from "ink";

import type { InviteClient, Project, UserClient } from "@dox/core";
import { loadConfig, saveConfig } from "@dox/core";

import type { Action, SettingsEditing, State } from "../../../state";
import { color } from "../../../theme";
import { ConfirmDialog } from "../../primitives/ConfirmDialog";
import { SettingsFormModal } from "./SettingsFormModal";

interface SettingsModalProps {
  editing: SettingsEditing;
  state: State;
  dispatch: (a: Action) => void;
  users?: UserClient;
  invites?: InviteClient;
  projects?: { list(): Promise<Project[]> };
  onRefresh?: () => Promise<void> | void;
  onSignedOut?: () => void;
}

export function SettingsModal({
  editing,
  state,
  dispatch,
  users,
  invites,
  projects,
  onRefresh,
  onSignedOut,
}: SettingsModalProps) {
  const cancel = () => dispatch({ type: "SETTINGS_EDIT", editing: null });

  if (editing.kind === "serverName") {
    return (
      <SettingsFormModal
        title="编辑服务器名称"
        help="最多 64 个字符，将显示在登录页和主界面标题栏。"
        fields={[
          {
            key: "name",
            label: "名称",
            placeholder: "我的 dox 服务器…",
            initial: state.settingsServer?.serverName ?? "",
          },
        ]}
        busy={state.settingsBusy}
        error={state.settingsError}
        onSubmit={async (vals) => {
          if (!users) return cancel();
          dispatch({ type: "SETTINGS_BUSY", busy: true });
          try {
            await users.updateSettings({ serverName: vals.name ?? "" });
            const next = await users.getSettings();
            dispatch({ type: "SETTINGS_BUSY", busy: false });
            dispatch({ type: "SETTINGS_SERVER_SET", settings: next });
            dispatch({ type: "SETTINGS_EDIT", editing: null });
          } catch (err) {
            dispatch({ type: "SETTINGS_ERROR", error: (err as Error).message });
          }
        }}
        onCancel={cancel}
      />
    );
  }

  if (editing.kind === "serverDescription") {
    return (
      <SettingsFormModal
        title="编辑服务器描述"
        help="最多 256 个字符，连接到此服务器的用户都可以看到。"
        fields={[
          {
            key: "description",
            label: "描述",
            placeholder: "简短介绍…",
            initial: state.settingsServer?.serverDescription ?? "",
          },
        ]}
        busy={state.settingsBusy}
        error={state.settingsError}
        onSubmit={async (vals) => {
          if (!users) return cancel();
          dispatch({ type: "SETTINGS_BUSY", busy: true });
          try {
            await users.updateSettings({
              serverDescription: vals.description ?? "",
            });
            const next = await users.getSettings();
            dispatch({ type: "SETTINGS_BUSY", busy: false });
            dispatch({ type: "SETTINGS_SERVER_SET", settings: next });
            dispatch({ type: "SETTINGS_EDIT", editing: null });
          } catch (err) {
            dispatch({ type: "SETTINGS_ERROR", error: (err as Error).message });
          }
        }}
        onCancel={cancel}
      />
    );
  }

  if (editing.kind === "changePassword") {
    return (
      <SettingsFormModal
        title="修改密码"
        help="请输入当前密码和新密码（至少 8 个字符）。输入内容会直接显示。"
        fields={[
          { key: "old", label: "当前密码", placeholder: "当前密码" },
          { key: "new", label: "新密码", placeholder: "新密码（至少 8 个字符）" },
        ]}
        busy={state.settingsBusy}
        error={state.settingsError}
        onSubmit={async (vals) => {
          if (!users) return cancel();
          if ((vals.new ?? "").length < 8) {
            dispatch({
              type: "SETTINGS_ERROR",
              error: "新密码至少需要 8 个字符。",
            });
            return;
          }
          dispatch({ type: "SETTINGS_BUSY", busy: true });
          try {
            await users.changePassword(vals.old ?? "", vals.new ?? "");
            dispatch({ type: "SETTINGS_BUSY", busy: false });
            dispatch({ type: "SETTINGS_EDIT", editing: null });
          } catch (err) {
            dispatch({ type: "SETTINGS_ERROR", error: (err as Error).message });
          }
        }}
        onCancel={cancel}
      />
    );
  }

  if (editing.kind === "redeemCode") {
    return (
      <SettingsFormModal
        title="兑换邀请码"
        help="粘贴他人分享给你的项目邀请码。"
        submitLabel="兑换"
        fields={[{ key: "code", label: "邀请码", placeholder: "ABC-12345" }]}
        busy={state.settingsBusy}
        error={state.settingsError}
        onSubmit={async (vals) => {
          if (!invites) return cancel();
          dispatch({ type: "SETTINGS_BUSY", busy: true });
          try {
            const res = await invites.accept(vals.code ?? "");
            let name = "";
            if (res.projectId && projects) {
              try {
                const list = await projects.list();
                name = list.find((p) => p.id === res.projectId)?.name ?? "";
              } catch {}
            }
            await onRefresh?.();
            dispatch({ type: "SETTINGS_BUSY", busy: false });
            dispatch({ type: "SETTINGS_EDIT", editing: null });
            const role = res.role === "viewer" ? "查看者" : "编辑者";
            const notice = name
              ? `已加入“${name}”，角色：${role}。`
              : res.projectId
                ? `已加入项目，角色：${role}。`
                : "已接受邀请。";
            dispatch({ type: "SETTINGS_NOTICE", notice });
          } catch (err) {
            dispatch({ type: "SETTINGS_ERROR", error: (err as Error).message });
          }
        }}
        onCancel={cancel}
      />
    );
  }

  if (editing.kind === "registrationToggle") {
    const next = editing.next;
    return (
      <ConfirmAction
        title={next ? "开放注册" : "关闭注册"}
        message={
          next
            ? "任何知道服务器地址的人都可以注册新账户。是否继续？"
            : "注册将需要你发出的服务器邀请码。现有用户不受影响。是否继续？"
        }
        tone={next ? color.accent2 : color.accent}
        busy={state.settingsBusy}
        error={state.settingsError}
        onConfirm={async () => {
          if (!users) return cancel();
          dispatch({ type: "SETTINGS_BUSY", busy: true });
          try {
            await users.updateSettings({ registrationOpen: next });
            const updated = await users.getSettings();
            dispatch({ type: "SETTINGS_BUSY", busy: false });
            dispatch({ type: "SETTINGS_SERVER_SET", settings: updated });
            dispatch({ type: "SETTINGS_EDIT", editing: null });
          } catch (err) {
            dispatch({ type: "SETTINGS_ERROR", error: (err as Error).message });
          }
        }}
        onCancel={cancel}
      />
    );
  }

  if (editing.kind === "signOut") {
    return (
      <ConfirmAction
        title="退出登录"
        message="你之后需要重新登录，服务器地址会保留。"
        tone={color.danger}
        busy={state.settingsBusy}
        error={state.settingsError}
        onConfirm={async () => {
          dispatch({ type: "SETTINGS_BUSY", busy: true });
          try {
            const cfg = await loadConfig();
            if (cfg) {
              await saveConfig({
                ...cfg,
                token: "",
                userId: "",
                userName: "",
                role: "",
              });
            }
            dispatch({ type: "SETTINGS_BUSY", busy: false });
            dispatch({ type: "CLOSE_SETTINGS" });
            onSignedOut?.();
          } catch (err) {
            dispatch({ type: "SETTINGS_ERROR", error: (err as Error).message });
          }
        }}
        onCancel={cancel}
      />
    );
  }

  if (editing.kind === "revokeInvite") {
    const inv = state.settingsOutgoing.find(
      (i) => i.codeHash === editing.codeHash,
    );
    const label = inv
      ? inv.projectId
        ? `${inv.projectName || "（项目已删除）"} · ${inv.role === "viewer" ? "查看者" : "编辑者"}`
        : "服务器邀请码"
      : "此邀请码";
    return (
      <ConfirmAction
        title="撤销邀请码"
        message={`确定撤销“${label}”？该邀请码将立即失效。`}
        tone={color.danger}
        busy={state.settingsBusy}
        error={state.settingsError}
        onConfirm={async () => {
          if (!invites) return cancel();
          dispatch({ type: "SETTINGS_BUSY", busy: true });
          try {
            await invites.revoke(editing.codeHash);
            const list = await invites.listOutgoing();
            dispatch({ type: "SETTINGS_BUSY", busy: false });
            dispatch({ type: "SETTINGS_OUTGOING_SET", invites: list });
            dispatch({ type: "SETTINGS_EDIT", editing: null });
          } catch (err) {
            dispatch({ type: "SETTINGS_ERROR", error: (err as Error).message });
          }
        }}
        onCancel={cancel}
      />
    );
  }

  return null;
}

function ConfirmAction({
  title,
  message,
  tone,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  tone: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useInput((input, key) => {
    if (key.escape || input === "n" || input === "N") {
      if (!busy) onCancel();
      return;
    }
    if (input === "y" || input === "Y") {
      if (!busy) onConfirm();
    }
  });

  const body = (
    <>
      <Text wrap="wrap">{message}</Text>
      {error && (
        <Box marginTop={1}>
          <Text color={color.danger} wrap="wrap">
            {error}
          </Text>
        </Box>
      )}
      {busy && (
        <Box marginTop={1}>
          <Text color={color.muted}>working…</Text>
        </Box>
      )}
    </>
  );

  return (
    <ConfirmDialog
      title={title}
      tone={tone}
      message={body}
      footerMode={title.toLowerCase()}
    />
  );
}
