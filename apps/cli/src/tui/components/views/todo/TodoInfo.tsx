import { Box, Text } from "ink";

import type { Project, Todo } from "@dox/core";
import { dueLabel, isOverdue } from "@dox/core";

import { renderMarkdown } from "../../primitives/Markdown";
import { color, icon } from "../../../theme";
import { swatchColor, windowLabel } from "../../../util";
import { relativeTimeZh } from "../../../locale";

interface TodoInfoProps {
  todo: Todo | null;
  project: Project | null;
  ownerName?: string;
  nowMs: number;
  panelWidth: number;
  panelHeight: number;
}

const BASE_FIXED_ROWS = 10;
const DESC_HEADER = 2;
const PANEL_CHROME = 4;

export function TodoInfo({
  todo,
  project,
  ownerName,
  nowMs,
  panelWidth,
  panelHeight,
}: TodoInfoProps) {
  if (!todo) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Text color={color.muted} dimColor>
          未选择待办
        </Text>
      </Box>
    );
  }
  const statusIcon = todo.done ? icon.done : icon.open;
  const statusColor = todo.done ? color.success : color.accent;
  const statusLabel = todo.done ? "已完成" : "未完成";

  const dueAt = todo.dueAt === undefined ? undefined : Number(todo.dueAt);
  const allDay = todo.dueAllDay ?? false;
  const remindAt =
    todo.remindAt === undefined ? undefined : Number(todo.remindAt);
  const startsAt =
    todo.startsAt === undefined ? undefined : Number(todo.startsAt);
  const endsAt = todo.endsAt === undefined ? undefined : Number(todo.endsAt);
  const hasWindow = startsAt !== undefined && endsAt !== undefined;
  const metaRows =
    (dueAt !== undefined ? 1 : 0) +
    (remindAt !== undefined ? 1 : 0) +
    (hasWindow ? 1 : 0);

  const contentW = Math.max(10, panelWidth - PANEL_CHROME);
  const contentH = Math.max(0, panelHeight - PANEL_CHROME);
  const descBudget = Math.max(
    0,
    contentH - BASE_FIXED_ROWS - metaRows - DESC_HEADER,
  );
  const rawDesc = todo.description?.trim() ?? "";
  const preview =
    rawDesc && descBudget > 0
      ? renderMarkdown(rawDesc, contentW, descBudget)
      : null;
  const overflowed =
    Boolean(preview?.truncated) || (rawDesc.length > 0 && descBudget === 0);

  return (
    <Box flexDirection="column">
      {}
      <Box>
        <Text color={statusColor} bold>
          {statusIcon} {statusLabel}
        </Text>
        <Box flexGrow={1} />
        <Text color={color.muted} dimColor>
          {todo.id.slice(0, 8).toLowerCase()}…
        </Text>
      </Box>

      {}
      <Box marginTop={1}>
        <Text color={color.accent} bold wrap="truncate">
          {todo.title}
        </Text>
      </Box>

      {}
      <Box flexDirection="column" marginTop={1}>
        <InfoRow label="项目">
          {project ? (
            <Text>
              <Text color={swatchColor(project.color)}>● </Text>
              <Text>{project.name}</Text>
            </Text>
          ) : (
            <Text color={color.muted} dimColor>
              ● 私密
            </Text>
          )}
        </InfoRow>
        <InfoRow label="创建者">
          <Text color={color.accent2}>
            {ownerName ?? todo.createdBy.slice(0, 8).toLowerCase() + "…"}
          </Text>
        </InfoRow>
        <InfoRow label="创建时间">
          <Text>{relativeTimeZh(nowMs, todo.createdAt)}</Text>
        </InfoRow>
        <InfoRow label="更新时间">
          <Text>{relativeTimeZh(nowMs, todo.updatedAt)}</Text>
        </InfoRow>
        {dueAt !== undefined && (
          <InfoRow label="截止时间">
            <Text
              color={
                isOverdue(dueAt, allDay, nowMs) ? color.danger : color.warn
              }
            >
              {dueLabel(dueAt, allDay, nowMs, todo.dueZone)}
              {allDay ? "（全天）" : ""}
            </Text>
          </InfoRow>
        )}
        {remindAt !== undefined && (
          <InfoRow label="提醒时间">
            <Text color={color.accent2}>
              {dueLabel(remindAt, false, nowMs)}
            </Text>
          </InfoRow>
        )}
        {startsAt !== undefined && endsAt !== undefined && (
          <InfoRow label="会议时间">
            <Text color={color.accent2}>{windowLabel(startsAt, endsAt)}</Text>
          </InfoRow>
        )}
      </Box>

      {}
      {preview && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={color.muted} dimColor>
            {"─ 描述 ".padEnd(Math.max(0, contentW), "─")}
          </Text>
          <Text color={color.muted}>{preview.text}</Text>
        </Box>
      )}

      {}
      <Box marginTop={1}>
        <Text color={color.muted} dimColor>
          按{" "}
          <Text color={color.accent} bold>
            ⏎
          </Text>{" "}
          {overflowed ? "阅读完整描述" : "查看详情"}
        </Text>
      </Box>
    </Box>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Box width={9}>
        <Text color={color.muted}>{label}</Text>
      </Box>
      {children}
    </Box>
  );
}
