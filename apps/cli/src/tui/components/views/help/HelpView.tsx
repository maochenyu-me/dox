import { Box, Text, useInput, useWindowSize } from "ink";

import { color, icon } from "../../../theme";
import { VERSION } from "../../../../version";
import { Footer } from "../../layout/Footer";

interface HelpViewProps {
  onClose: () => void;
}

const navigate: ReadonlyArray<readonly [string, string]> = [
  ["j / ↓", "向下移动"],
  ["k / ↑", "向上移动"],
  ["h / l", "切换侧栏/列表"],
  ["Tab", "下一个筛选"],
  ["g / G", "第一个 / 最后一个"],
];

const act: ReadonlyArray<readonly [string, string]> = [
  ["空格", "切换完成状态"],
  ["i / a", "添加待办"],
  ["e", "编辑待办"],
  ["d", "删除待办"],
  ["p", "新建项目"],
  ["m", "管理项目"],
  ["D", "删除项目"],
  ["/", "搜索待办"],
  ["n", "提醒"],
  ["r", "刷新"],
  ["start/end", "会议时间（编辑器）"],
];
const app: ReadonlyArray<readonly [string, string]> = [
  ["s", "打开设置"],
  ["A", "关于 dox"],
  ["?", "显示/隐藏帮助"],
  ["q / Ctrl+C", "退出"],
  ["esc", "关闭/取消"],
  ["dox todo move", "从终端调整顺序"],
];

export function HelpView({ onClose }: HelpViewProps) {
  const { columns: cols, rows: totalRows } = useWindowSize();

  useInput((input, key) => {
    if (input === "?" || key.escape || key.return) onClose();
  });

  const cardWidth = Math.min(86, Math.max(60, cols - 4));
  const cardRows = 20;
  const topPad = Math.max(1, Math.floor((totalRows - cardRows - 3) / 2));

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box height={topPad} />
      <Box justifyContent="center">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={color.accent}
          paddingX={2}
          paddingY={1}
          width={cardWidth}
        >
          <Text bold color={color.accent}>
            {icon.brand} 快捷键
          </Text>
          <Box marginTop={1}>
            {}
            <Box flexDirection="column" flexGrow={1} flexBasis={0}>
              <Section title="导航" rows={navigate} />
              <Section title="应用" rows={app} marginTop />
            </Box>
            <Box width={2} />
            <Box flexDirection="column" flexGrow={1} flexBasis={0}>
              <Section title="操作" rows={act} />
            </Box>
          </Box>
        </Box>
      </Box>
      <Footer
        mode="help"
        version={VERSION}
        outerPadX={1}
        hints={[
          ["?", "返回"],
          ["esc", "返回"],
          ["⏎", "返回"],
        ]}
      />
    </Box>
  );
}

function Section({
  title,
  rows,
  marginTop = false,
}: {
  title: string;
  rows: ReadonlyArray<readonly [string, string]>;
  marginTop?: boolean;
}) {
  return (
    <Box flexDirection="column" marginTop={marginTop ? 1 : 0}>
      <Text color={color.muted}>{title}</Text>
      {rows.map(([k, l]) => (
        <Box key={k}>
          <Box width={14}>
            <Text color={color.accent}> {k}</Text>
          </Box>
          <Text wrap="truncate">{l}</Text>
        </Box>
      ))}
    </Box>
  );
}
