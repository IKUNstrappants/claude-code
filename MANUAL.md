# Claude Code 启动手册

这份手册说明如何启动这个仓库里的 Claude Code，以及如何把它打开到你自己的项目目录里。

## 1. 前置要求

- Windows 已安装 WSL
- WSL 发行版已可正常使用
- WSL 内已安装 `bun`

如果你只是想运行仓库自带的 Windows 启动器，还需要满足：

- 先把这个仓库克隆到本机任意目录

## 2. 启动当前仓库里的 Claude Code

这是“直接打开当前仓库”的方式。

### 方法 A：直接使用 Windows 启动器

在仓库根目录双击下面这个文件：

```text
ClaudeCode-WSL.exe
```

它会：

- 调用 `wsl.exe`
- 进入你配置的 WSL 发行版
- 切换到当前仓库目录
- 如果 `dist/cli.js` 不存在，就先自动构建
- 启动 Claude Code

注意：

- 这个启动器默认打开的是当前仓库目录，不是别的项目目录
- 如果 WSL 或 `bun` 没装好，启动会失败

### 方法 B：在仓库里手动启动

在仓库根目录里直接启动开发模式：

```bash
bun run dev
```

或者先构建，再运行产物：

```bash
bun run build
bun ./dist/cli.js
```

## 3. 打开到指定项目目录

如果你希望 Claude Code 一启动就工作在另一个项目里，推荐这样做：

1. 先进入目标项目目录
2. 再运行这个仓库构建出来的 CLI

例如，你想操作的是同级目录下的另一个项目：

```text
../my-app
```

对应的 WSL 路径示例就是：

```bash
cd ../my-app
```

然后从当前仓库运行 CLI：

```bash
~/.bun/bin/bun ../claude-code/dist/cli.js
```

这样启动后，Claude Code 的当前工作目录就是你刚才进入的目标项目目录。

## 4. 首次使用推荐流程

如果你是第一次使用，推荐按这个顺序：

```bash
bun install
bun run build
cd ../my-app
~/.bun/bin/bun ../claude-code/dist/cli.js
```

这里的 `../my-app` 只是示例，你可以换成自己的项目目录。

## 5. DeepSeek 配置

这个项目只允许通过 DeepSeek API 运行。

你只需要配置一个环境变量：

```bash
ANTHROPIC_API_KEY
```

配置文件示例：

```bash
mkdir -p ~/.config/claude-code
cat > ~/.config/claude-code/deepseek.env <<'EOF'
export ANTHROPIC_API_KEY="你的 DeepSeek API Key"
# 或者：
# export ANTHROPIC_AUTH_TOKEN="你的 DeepSeek API Key"
EOF
```

启动器会优先规范成 `ANTHROPIC_API_KEY`，避免同时存在 `ANTHROPIC_API_KEY` 和 `ANTHROPIC_AUTH_TOKEN` 时触发认证冲突提示。

启动器会固定使用这些内置配置：

```bash
ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
ANTHROPIC_MODEL=deepseek-chat
ANTHROPIC_DEFAULT_HAIKU_MODEL=deepseek-chat
CLAUDE_CODE_MAX_CONTEXT_TOKENS=128000
CLAUDE_CODE_MAX_OUTPUT_TOKENS=8192
```

也就是说：

- 不需要手动配置 API 地址
- 不需要手动配置输入输出 token 上限
- 不支持切换到其他提供商或代理地址

官方参考：

- https://api-docs.deepseek.com/quick_start/pricing
- https://api-docs.deepseek.com/quick_start/parameter_settings

## 6. 常见问题

### 找不到 `bun`

说明 `bun` 没装好，或者没有加到 WSL 的 `PATH` 里。可以先检查：

```bash
which bun
bun --version
```

### 双击启动器后打开的不是目标项目

这是正常的。`ClaudeCode-WSL.exe` 默认只打开它所在的仓库目录。

如果你要操作别的项目，请先 `cd` 到目标目录，再运行：

```bash
~/.bun/bin/bun ../claude-code/dist/cli.js
```

### `dist/cli.js` 不存在

先在仓库根目录构建一次：

```bash
cd ./claude-code
bun run build
```

## 7. 一句话总结

- 想打开当前仓库：直接运行 `ClaudeCode-WSL.exe`
- 想打开别的项目：先 `cd` 到目标目录，再运行 `../claude-code/dist/cli.js`
