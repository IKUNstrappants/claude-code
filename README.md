# Claude Code Best V3 (CCB)

Claude Code Best V3 是一个对 Anthropic 官方 Claude Code CLI 的逆向还原项目。目标是保留它作为终端 AI 编程助手的核心能力，同时把仓库整理成更适合研究、定制和本地构建的形态。

这个仓库现在采用 DeepSeek-only 的运行方式。启动器默认走 DeepSeek 的 Anthropic 兼容端点，token 上限也已经按 DeepSeek 的输入输出限制收敛。更具体的启动方式、API Key 配置和 DeepSeek 约束，请直接看 [MANUAL.md](MANUAL.md)。

## 项目概览

这个项目不是普通聊天界面，而是一个完整的 terminal-native agent loop。它会在本地目录里读取代码、修改文件、调用工具、执行命令、收集上下文，然后把结果继续喂回模型，形成持续的开发循环。

你可以把它理解成四个部分的组合：

- 一个终端交互壳
- 一个带工具系统的 agent 编排器
- 一套上下文管理与压缩机制
- 一组适合本地运行和发布的构建产物

## 项目框架

仓库整体可以分成六层：

### 1. 启动层

- `launcher/` 和 `launcher-entry.sh` 负责在 Windows 和 WSL 场景下启动程序
- `ClaudeCode-WSL.exe` 是便捷启动入口
- `config.toml` 控制一些运行时约束，比如网络策略

### 2. 入口层

- `src/entrypoints/cli.tsx` 是主入口
- `src/main.tsx` 负责命令行参数、交互模式和启动流程
- `src/cli/` 里是 CLI 行为的具体实现

### 3. 交互层

- `src/components/`、`src/ink.ts`、`src/screens/` 负责终端 UI
- 这里包含主对话界面、设置页、诊断页、恢复页等

### 4. Agent 层

- `src/query.ts` 是核心对话循环
- `src/QueryEngine.ts` 负责调度、状态流转和请求之间的衔接
- `src/context.ts` 负责拼装系统上下文、当前目录信息、记忆和提示词

### 5. 工具与服务层

- `src/tools/` 是工具实现，例如文件读写、Shell、MCP、任务、搜索
- `src/services/` 是更高层的服务组件，例如 API、压缩、认证、分析、同步和 MCP
- `src/utils/` 是大量通用能力，包含鉴权、模型能力、上下文预算、权限、路径和环境处理

### 6. 构建与发布层

- `build.ts` 负责构建和 code splitting
- `dist/` 是构建输出
- `README.md`、`MANUAL.md` 和 `docs/` 是文档入口

## 仓库结构

```text
claude-code/
├── src/                # 主要源码
├── packages/           # workspace 内部包
├── launcher/           # Windows 启动器源码
├── dist/               # 构建产物
├── docs/               # 文档站内容
├── scripts/            # 辅助脚本
├── MANUAL.md           # 启动和使用手册
└── codex_workspace/    # Codex 私有工作区
```

## 主要能力

- 终端 REPL 交互
- 文件读写、Shell、搜索、MCP 等工具调用
- 上下文构建与自动压缩
- 权限控制、会话恢复、诊断和状态管理
- 本地构建和发布

## 运行方式

如果你只是想把仓库跑起来，最简单的流程是：

```bash
bun install
bun run build
```

如果你想按 DeepSeek 方式启动，或者要在 WSL 里打开某个项目，请直接看 [MANUAL.md](MANUAL.md)。

## 文档

- [启动手册 / 操作说明](MANUAL.md)
- [项目文档站](https://deepwiki.com/claude-code-best/claude-code)

## 备注

这个仓库保留了大量逆向还原后的实现和内部结构，很多模块更偏工程化而不是示例代码。如果你要改运行参数、DeepSeek 配置或者启动路径，优先看 [MANUAL.md](MANUAL.md)。
