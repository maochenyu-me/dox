import {
  Box,
  Text,
  useFocus,
  useFocusManager,
  useInput,
  useWindowSize,
} from "ink";
import { TextInput } from "@inkjs/ui";
import { useState } from "react";

import { parseWhen } from "@dox/core";

import { color, icon } from "../../../theme";
import { VERSION } from "../../../../version";
import { Footer } from "../../layout/Footer";
import { MultilineInput } from "../../primitives/MultilineInput";
import { TitledPanel } from "../../primitives/TitledPanel";

export interface TodoEditorPayload {
  title: string;
  description: string;
  /** Raw deadline text; empty clears. */
  due: string;
  /** Raw reminder text; empty clears. */
  remind: string;
  /** Raw meeting start text; empty means no meeting. */
  meetStart: string;
  /** Raw meeting end text; empty means no meeting. */
  meetEnd: string;
}

interface TodoEditorViewProps {
  mode: "add" | "edit";
  defaultTitle?: string;
  defaultDescription?: string;
  defaultDue?: string;
  defaultRemind?: string;
  defaultMeetStart?: string;
  defaultMeetEnd?: string;
  onSubmit: (payload: TodoEditorPayload) => void;
  onCancel: () => void;
}

const TITLE_FIELD = "todo-editor:title";
const DUE_FIELD = "todo-editor:due";
const REMIND_FIELD = "todo-editor:remind";
const MEET_START_FIELD = "todo-editor:meet-start";
const MEET_END_FIELD = "todo-editor:meet-end";
const DESC_FIELD = "todo-editor:description";

const WHEN_HINT = '2026-11-05 · "2026-11-05 09:30" · 09:30 · +2h';

/**
 * A value that could still become a valid date/time if the user kept typing
 * ("2026-", "2026-11-18 0", "+2"). The live hint stays quiet for these so the
 * error row does not flicker in and out of the frame on every keystroke.
 */
function looksLikeIncompleteWhen(raw: string): boolean {
  const s = raw.trim();
  if (s === "") return true;
  if (/^\+\s*\d*\s*[mhdw]?$/i.test(s)) return true; // +2, +30, +30m…
  if (/^\d{1,2}:?\d{0,2}$/.test(s)) return true; // 09, 09:3, 09:30
  if (/^\d{0,4}(-\d{0,2}){0,2}-?$/.test(s)) return true; // 2026, 2026-11-, 2026-11-05
  if (/^\d{4}-\d{2}-\d{2}[ T]?\d{0,2}:?\d{0,2}$/.test(s)) return true; // date [T ]hh[:mm]
  return false;
}

export function TodoEditorView({
  mode,
  defaultTitle,
  defaultDescription,
  defaultDue,
  defaultRemind,
  defaultMeetStart,
  defaultMeetEnd,
  onSubmit,
  onCancel,
}: TodoEditorViewProps) {
  const { columns, rows: windowRows } = useWindowSize();
  const cols = Math.max(60, columns);
  const rows = Math.max(15, windowRows);

  const [title, setTitle] = useState(defaultTitle ?? "");
  const [description, setDescription] = useState(defaultDescription ?? "");
  const [due, setDue] = useState(defaultDue ?? "");
  const [remind, setRemind] = useState(defaultRemind ?? "");
  const [meetStart, setMeetStart] = useState(defaultMeetStart ?? "");
  const [meetEnd, setMeetEnd] = useState(defaultMeetEnd ?? "");

  const { focus } = useFocusManager();

  const dueInvalid = due.trim().length > 0 && !parseWhen(due);
  const dueLiveInvalid = dueInvalid && !looksLikeIncompleteWhen(due);
  const remindInvalid = remind.trim().length > 0 && !parseWhen(remind);
  const remindLiveInvalid = remindInvalid && !looksLikeIncompleteWhen(remind);
  const meetError = meetingError(meetStart, meetEnd);
  const meetLiveError = meetingLiveError(meetStart, meetEnd);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.ctrl && input === "s") {
      const trimmed = title.trim();
      if (trimmed === "") {
        onCancel();
        return;
      }
      // Keep the sheet open on bad input so the user's typing survives.
      if (dueInvalid || remindInvalid || meetError) return;
      onSubmit({
        title: trimmed,
        description,
        due,
        remind,
        meetStart,
        meetEnd,
      });
    }
  });

  const headerTitle = mode === "add" ? "新建待办" : "编辑待办";
  const subtitle =
    mode === "add"
      ? "记录一项新任务。Ctrl+S 保存 · Esc 取消。"
      : "修改标题、截止时间、会议时间和 Markdown 描述。";

  const cardWidth = Math.min(80, cols - 8);

  return (
    <Box flexDirection="column" paddingX={1} height={rows - 1}>
      <Box
        flexGrow={1}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
      >
        <TitledPanel
          title={headerTitle}
          width={cardWidth}
          paddingX={2}
          paddingY={1}
          focused
        >
          <Text color={color.muted}>{subtitle}</Text>

          <Field id={TITLE_FIELD} label="标题" autoFocus value={title}>
            {(focused) => (
              <TextInput
                isDisabled={!focused}
                defaultValue={defaultTitle}
                placeholder={mode === "add" ? "待办标题…" : undefined}
                onChange={setTitle}
                onSubmit={(value) => {
                  setTitle(value);
                  focus(DUE_FIELD);
                }}
              />
            )}
          </Field>

          <Field id={DUE_FIELD} label="截止" value={due}>
            {(focused) => (
              <TextInput
                isDisabled={!focused}
                defaultValue={defaultDue}
                placeholder={`可选 · ${WHEN_HINT}`}
                onChange={setDue}
                onSubmit={(value) => {
                  setDue(value);
                  focus(REMIND_FIELD);
                }}
              />
            )}
          </Field>
          {dueLiveInvalid && (
            <Box marginLeft={4}>
              <Text color={color.danger}>无法识别的日期 · {WHEN_HINT}</Text>
            </Box>
          )}

          <Field id={REMIND_FIELD} label="提醒" value={remind}>
            {(focused) => (
              <TextInput
                isDisabled={!focused}
                defaultValue={defaultRemind}
                placeholder="可选 · 默认在截止时间提醒"
                onChange={setRemind}
                onSubmit={(value) => {
                  setRemind(value);
                  focus(MEET_START_FIELD);
                }}
              />
            )}
          </Field>
          {remindLiveInvalid && (
            <Box marginLeft={4}>
              <Text color={color.danger}>无法识别的时间 · {WHEN_HINT}</Text>
            </Box>
          )}
          {!remindInvalid && due.trim() !== "" && remind.trim() === "" && (
            <Box marginLeft={4}>
              <Text color={color.muted} dimColor>
                将会在截止时间提醒你
              </Text>
            </Box>
          )}

          <Field id={MEET_START_FIELD} label="开始" value={meetStart}>
            {(focused) => (
              <TextInput
                isDisabled={!focused}
                defaultValue={defaultMeetStart}
                placeholder={`可选 · 会议开始时间 · ${WHEN_HINT}`}
                onChange={setMeetStart}
                onSubmit={(value) => {
                  setMeetStart(value);
                  focus(MEET_END_FIELD);
                }}
              />
            )}
          </Field>

          <Field id={MEET_END_FIELD} label="结束" value={meetEnd}>
            {(focused) => (
              <TextInput
                isDisabled={!focused}
                defaultValue={defaultMeetEnd}
                placeholder={`可选 · 会议结束时间 · ${WHEN_HINT}`}
                onChange={setMeetEnd}
                onSubmit={(value) => {
                  setMeetEnd(value);
                  focus(DESC_FIELD);
                }}
              />
            )}
          </Field>
          {meetLiveError && (
            <Box marginLeft={4}>
              <Text color={color.danger}>{meetLiveError}</Text>
            </Box>
          )}

          <Field id={DESC_FIELD} label="描述" value={description}>
            {(focused) => (
              <MultilineInput
                isDisabled={!focused}
                value={description}
                onChange={setDescription}
                placeholder="可选 · Markdown（**粗体**、`代码`、[链接](url)、#、-、```）"
                width={cardWidth - 6}
                maxRows={8}
              />
            )}
          </Field>

          <Box marginTop={1}>
            <Text color={color.muted}>
              Enter 跳到下一项 · Ctrl+S 保存 · Esc 取消
            </Text>
          </Box>
        </TitledPanel>
      </Box>
      <Footer
        mode={mode === "add" ? "insert" : "edit"}
        version={VERSION}
        outerPadX={1}
        hints={[
          ["⏎", "下一项"],
          ["^S", "保存"],
          ["esc", "取消"],
        ]}
      />
    </Box>
  );
}

/**
 * A meeting is one window, so half of it is never a valid edit — and an end
 * before its start is a typo, not intent. Both are caught here so the sheet
 * can point at the fields instead of closing and letting the server reject a
 * patch the user has to retype from scratch.
 */
function meetingError(startRaw: string, endRaw: string): string | null {
  const start = startRaw.trim();
  const end = endRaw.trim();
  if (start === "" && end === "") return null;
  if (start === "" || end === "") {
    return "会议必须同时填写开始和结束时间";
  }
  const from = parseWhen(start);
  if (!from) return `无法识别的会议开始时间 · ${WHEN_HINT}`;
  const to = parseWhen(end);
  if (!to) return `无法识别的会议结束时间 · ${WHEN_HINT}`;
  if (to.at <= from.at) return "会议结束时间必须晚于开始时间";
  return null;
}

/**
 * The live variant only complains once both sides parse — half-typed windows
 * ("2026-11-18 2" in one box, the other still empty) are mid-typing, not
 * mistakes. Ctrl+S still runs the strict check above.
 */
function meetingLiveError(startRaw: string, endRaw: string): string | null {
  const start = startRaw.trim();
  const end = endRaw.trim();
  if (start === "" || end === "") return null;
  if (!parseWhen(start) || !parseWhen(end)) return null;
  return meetingError(startRaw, endRaw);
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  autoFocus?: boolean;
  children: (focused: boolean) => React.ReactNode;
}

function Field({ id, label, value, autoFocus, children }: FieldProps) {
  const { isFocused } = useFocus({ id, autoFocus });
  return (
    <Box marginTop={1} flexDirection="column">
      <Box>
        <Box width={14}>
          <Text color={isFocused ? color.accent : color.muted} bold={isFocused}>
            {`${isFocused ? icon.chevron : " "}  ${label}`}
          </Text>
        </Box>
        {value.length === 0 && (
          <Text color={color.muted} dimColor>
            (empty)
          </Text>
        )}
      </Box>
      <Box marginLeft={4}>{children(isFocused)}</Box>
    </Box>
  );
}
