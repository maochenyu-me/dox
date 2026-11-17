<p align="left">
  <img src="./docs/dox.png" width="96" alt="dox logo">
</p>

# dox（中文汉化版）

> 一个安静的待办事项管理工具。

这是 [lin-snow/dox](https://github.com/lin-snow/dox) 的**个人自用汉化分支**，面向 Windows 本地使用做了适配：CLI/TUI 界面已全部汉化为简体中文，并提供 Windows 免安装的 exe。

![screenshot](./docs/imgs/screenshot.png)

## 特性

- 终端优先 — 默认启动 TUI（交互界面），脚本场景用子命令
- 项目 + 私密收件箱，Markdown 描述，完成/未完成
- 截止时间 + 提醒 — 支持具体时间或全天日期，应用内提醒列表
- 会议时间 — 一条待办可附带开始/结束时间，可导出 iCalendar
- 全文搜索（标题 + 描述）
- 多用户 — 首个注册者成为所有者，其他人凭邀请码加入
- 动态流 — 记录谁在何时改了什么
- 单文件 SQLite，备份就是复制一个文件

## Windows 快速开始

1. 到 [Releases](../../releases) 页面下载 `dox.exe`（或整个 ZIP）
2. 放到任意目录，在终端运行：

```powershell
.\dox.exe
```

首次运行会自动完成本地注册（创建本地账户），然后直接进入 TUI。无需安装
Go、Bun、Node.js、Docker，全程离线可用。

本地数据位置：

| 内容          | 路径                                     |
| ------------- | ---------------------------------------- |
| SQLite 数据库 | `%LOCALAPPDATA%\dox\data\dox.db`         |
| 本地账户凭据  | `%LOCALAPPDATA%\dox\profiles\local.toml` |

常用命令：

```powershell
.\dox.exe list          # 列出待办
.\dox.exe add "买牛奶"   # 新增待办
.\dox.exe todo ics      # 导出会议为 iCalendar
```

### 连接远程服务器（可选）

```powershell
.\dox.exe login --server https://example.com
.\dox.exe --server https://example.com list
```

## 与上游的差异

- CLI/TUI 全部界面文案汉化为简体中文（命令名、参数、快捷键保持不变）
- 发布产物只保留 Windows 的 `dox.exe` / `dox-server.exe`，已移除 Docker 镜像与 npm 发布
- 修复 Windows 下 TUI 重绘、日志重定向、独立构建等问题
- 修复待办编辑器回车跳过会议时间字段的问题

## 环境变量（服务端）

| 变量                    | 默认值          | 说明                                |
| ----------------------- | --------------- | ----------------------------------- |
| `DOX_DB_PATH`           | `./data/dox.db` | SQLite 文件位置                     |
| `DOX_LISTEN_ADDR`       | `:6278`         | HTTP 监听地址                       |
| `DOX_LOG_LEVEL`         | `info`          | `debug` / `info` / `warn` / `error` |
| `DOX_EVENT_RETENTION`   | `360h`          | 动态流保留时长，`0` 关闭清理        |
| `DOX_REMINDER_INTERVAL` | `30s`           | 截止提醒扫描间隔，`0s` 关闭         |
| `DOX_REMINDER_GRACE`    | `1h`            | 服务重启后回补提醒的时间范围        |

本地模式下无需任何配置，全部使用默认值。

## 开发

```
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │   CLI    │   │   TUI    │   │   any    │
       │          │   │          │   │  client  │
       └────┬─────┘   └────┬─────┘   └────┬─────┘
            │              │              │
            │  HTTP/JSON   │  HTTP/JSON   │  HTTP/JSON
            └──────────────┼──────────────┘
                           ▼
                  ┌─────────────────┐
                  │   dox-server    │
                  │   (Go + SQLite) │
                  └─────────────────┘
```

需要 Go 1.27+ 和 Bun：

```bash
just gen            # 生成 proto / sqlc 代码
just serve          # 本地跑服务端
just cli            # 对本地服务端执行 CLI
just windows-build  # 构建 Windows amd64 ZIP
just release v1.0.0 # 打 tag 触发 Release 发布
```

## 许可

上游项目以 [AGPL-3.0](LICENSE) 发布，本分支沿用。
