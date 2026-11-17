import { Box, Text, useInput, useWindowSize } from "ink";

import type { Project, Todo } from "@dox/core";
import { formatWhenInput, isOverdue } from "@dox/core";

import { color, icon } from "../../../theme";
import { swatchColor, windowLabel } from "../../../util";
import { relativeTimeZh } from "../../../locale";
import { VERSION } from "../../../../version";
import { Footer } from "../../layout/Footer";
import { Markdown, MarkdownEmpty } from "../../primitives/Markdown";
import { TitledPanel } from "../../primitives/TitledPanel";

interface TodoDetailViewProps {
  todo: Todo;
  project: Project | null;
  ownerName?: string;
  nowMs: number;
  onClose: () => void;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TodoDetailView({
  todo,
  project,
  ownerName,
  nowMs,
  onClose,
  onToggleDone,
  onEdit,
  onDelete,
}: TodoDetailViewProps) {
  const { columns: cols, rows } = useWindowSize();
  const panelWidth = Math.min(96, Math.max(60, cols - 4));
  const panelHeight = Math.min(28, Math.max(16, rows - 6));
  const topPad = Math.max(1, Math.floor((rows - panelHeight - 3) / 2));

  useInput((input, key) => {
    if (key.escape) return onClose();
    if (input === " ") return onToggleDone();
    if (input === "e") return onEdit();
    if (input === "d") return onDelete();
  });

  const statusIcon = todo.done ? icon.done : icon.open;
  const statusColor = todo.done ? color.success : color.accent;
  const statusLabel = todo.done ? "已完成" : "未完成";

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box height={topPad} />
      <Box justifyContent="center">
        <TitledPanel
          title="待办详情"
          width={panelWidth}
          height={panelHeight}
          paddingX={2}
          paddingY={1}
          focused
        >
          {}
          <Box>
            <Box borderStyle="round" borderColor={statusColor} paddingX={2}>
              <Text color={statusColor} bold>
                {statusIcon} {statusLabel}
              </Text>
            </Box>
            <Box flexGrow={1} />
            <Box alignItems="center">
              <Text color={color.muted}>{todo.id.toLowerCase()}</Text>
            </Box>
          </Box>

          {}
          <Box marginTop={1}>
            <Text color={color.accent} bold wrap="truncate">
              {todo.title}
            </Text>
          </Box>

          {}
          <Box marginTop={1}>
            <Box
              flexDirection="column"
              width={Math.floor((panelWidth - 8) / 2)}
            >
              <MetaRow label="项目">
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
              </MetaRow>
              <MetaRow label="创建者">
                <Text color={color.accent2}>
                  {ownerName ?? todo.createdBy.toLowerCase()}
                </Text>
              </MetaRow>
            </Box>
            <Box flexDirection="column" flexGrow={1}>
              <MetaRow label="创建时间">
                <Text>{relativeTimeZh(nowMs, todo.createdAt)}</Text>
              </MetaRow>
              <MetaRow label="更新时间">
                <Text>{relativeTimeZh(nowMs, todo.updatedAt)}</Text>
              </MetaRow>
              {todo.dueAt !== undefined && (
                <MetaRow label="截止时间">
                  <Text
                    color={
                      isOverdue(
                        Number(todo.dueAt),
                        todo.dueAllDay ?? false,
                        nowMs,
                      )
                        ? color.danger
                        : color.warn
                    }
                  >
                    {formatWhenInput(
                      Number(todo.dueAt),
                      todo.dueAllDay ?? false,
                      todo.dueZone,
                    )}
                    {todo.dueAllDay ? "（全天）" : ""}
                  </Text>
                </MetaRow>
              )}
              {todo.remindAt !== undefined && (
                <MetaRow label="提醒时间">
                  <Text color={color.accent2}>
                    {formatWhenInput(Number(todo.remindAt), false)}
                  </Text>
                </MetaRow>
              )}
              {todo.startsAt !== undefined && todo.endsAt !== undefined && (
                <MetaRow label="会议时间">
                  <Text color={color.accent2}>
                    {windowLabel(Number(todo.startsAt), Number(todo.endsAt))}
                  </Text>
                </MetaRow>
              )}
            </Box>
          </Box>

          {}
          <Box marginTop={1}>
            <Text color={color.muted}>
              {"─".repeat(Math.max(10, panelWidth - 6))}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text bold color={color.muted}>
              描述
            </Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            {todo.description ? (
              <Markdown source={todo.description} width={panelWidth - 6} />
            ) : (
              <MarkdownEmpty hint="暂无描述。按 e 添加。" />
            )}
          </Box>
        </TitledPanel>
      </Box>

      <Footer
        mode="detail"
        version={VERSION}
        outerPadX={1}
        hints={[
          ["␣", "toggle"],
          ["e", "edit"],
          ["d", "delete"],
          ["esc", "back"],
        ]}
      />
    </Box>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Box width={12}>
        <Text color={color.muted}>{label}</Text>
      </Box>
      {children}
    </Box>
  );
}
