export const zh = {
  app: "待办事项",
  selfHostedTodo: "本地待办",
  server: "服务器",
  status: "状态",
  activity: "动态",
  todos: "待办",
  todo: "待办事项",
  todoInfo: "待办详情",
  open: "未完成",
  done: "已完成",
  doneToday: "今日完成",
  due: "待处理",
  inbox: "私密",
  project: "项目",
  loading: "加载中…",
  noDescription: "暂无描述。按 e 添加。",
  noTodoSelected: "未选择待办",
  description: "描述",
  details: "查看详情",
  readFullDescription: "阅读完整描述",
  back: "返回",
  cancel: "取消",
  close: "关闭",
  save: "保存",
  next: "下一项",
  edit: "编辑",
  delete: "删除",
  toggle: "切换完成状态",
  search: "搜索",
  navigate: "导航",
  openItem: "打开",
  settings: "设置",
  help: "帮助",
  about: "关于",
  reminders: "提醒",
  invite: "邀请",
  member: "成员",
  members: "成员",
  account: "账户",
  owner: "所有者",
  viewer: "查看者",
  editor: "编辑者",
} as const;

export function relativeTimeZh(now: number, raw: unknown): string {
  const ms = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : 0;
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const diff = Math.max(0, now - ms);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天`;
  return `${Math.floor(days / 7)}周`;
}

export function elapsedZh(scheduled: number, now: number): string {
  const diff = Math.max(0, now - scheduled);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

export function activityVerbZh(verb: string): string {
  switch (verb) {
    case "todo_completed": return "完成了";
    case "todo_created": return "创建了";
    case "member_joined": return "加入了";
    default: return "更新了";
  }
}
