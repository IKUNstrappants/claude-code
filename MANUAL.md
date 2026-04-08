# Claude Code 启动手册

本文档说明如何启动这个仓库里的 Claude Code，以及如何让它一打开就进入你想操作的项目目录。

## 1. 前置要求

- Windows 已安装 WSL
- WSL 发行版名称为 `Ubuntu-22.04`
- WSL 内已安装 `bun`

如果你只是想运行仓库自带的 Windows 启动器，还需要：

- 当前仓库位于本机磁盘路径中，例如 `D:\Python_Projects\claude-code`

## 2. 启动当前仓库里的 Claude Code

这是“打开到本仓库目录”的方式。

### 方法 A：直接使用 Windows 启动器

在仓库根目录双击下面的文件即可：

```text
ClaudeCode-WSL.exe
```

它会做这些事：

- 调用 `wsl.exe`
- 进入 WSL 的 `Ubuntu-22.04`
- 切到当前仓库目录
- 如果 `dist/cli.js` 不存在，先自动构建
- 启动 Claude Code

注意：

- 这个启动器默认打开的是当前仓库目录，不是别的项目目录
- 如果 WSL 或 bun 没装好，启动会失败

### 方法 B：在仓库里手动启动

先进入仓库目录：

```bash
cd /mnt/d/Python_Projects/claude-code
```

开发模式启动：

```bash
bun run dev
```

或者先构建，再运行产物：

```bash
bun run build
bun dist/cli.js
```

## 3. 打开到指定项目目录

如果你想让 Claude Code 一启动就工作在某个项目里，最稳妥的方法不是双击 `ClaudeCode-WSL.exe`，而是：

1. 先进入目标项目目录
2. 再从该目录启动这个仓库的 CLI

例如，你要操作这个项目：

```text
D:\Python_Projects\my-app
```

对应的 WSL 路径通常是：

```bash
/mnt/d/Python_Projects/my-app
```

先在 WSL 中进入目标项目目录：

```bash
cd /mnt/d/Python_Projects/my-app
```

然后运行本仓库构建出的 Claude Code：

```bash
~/.bun/bin/bun /mnt/<claude-code_root_path>/dist/cli.js
```

这样启动后，Claude Code 的当前工作目录就是：

```text
/mnt/d/Python_Projects/my-app
```

也就是你真正要处理的项目目录。

## 4. 首次使用推荐流程

如果你是第一次使用，建议按这个顺序：

```bash
cd /mnt/d/Python_Projects/claude-code
bun install
bun run build
cd /mnt/d/Python_Projects/你的项目目录
~/.bun/bin/bun /mnt/d/Python_Projects/claude-code/dist/cli.js
```

## 5. DeepSeek 配置

这个项目只允许通过 DeepSeek API 运行。

用户只需要配置一项：

```bash
ANTHROPIC_API_KEY
```

配置方法：

```bash
mkdir -p ~/.config/claude-code
cat > ~/.config/claude-code/deepseek.env <<'EOF'
export ANTHROPIC_API_KEY="你的 DeepSeek API Key"
EOF
```

启动器会固定使用下面这组内置配置：

```bash
ANTHROPIC_BASE_URL=https://api.deepseek.com/beta
CLAUDE_CODE_MAX_CONTEXT_TOKENS=128000
CLAUDE_CODE_MAX_OUTPUT_TOKENS=8192
```

也就是说：

- 不需要手动配置 URL
- 不需要手动配置输入输出 token 上限
- 不支持自定义到其他提供商或其他代理地址

官方文档参考：

- https://api-docs.deepseek.com/quick_start/pricing
- https://api-docs.deepseek.com/quick_start/parameter_settings

## 6. 常见问题

### 找不到 `bun`

说明 bun 没有安装，或者不在 WSL 的 `PATH` 中。可先检查：

```bash
which bun
bun --version
```

### 双击启动器后打开的不是目标项目

这是正常现象。`ClaudeCode-WSL.exe` 默认会进入当前仓库目录。

如果你要打开别的项目，请使用“先 `cd` 到目标项目，再运行 `dist/cli.js`”的方式。

### `dist/cli.js` 不存在

先在仓库根目录执行：

```bash
cd /mnt/d/Python_Projects/claude-code
bun run build
```

## 7. 一句话总结

- 想打开当前仓库：直接运行 `ClaudeCode-WSL.exe`
- 想打开别的项目：先 `cd` 到目标项目目录，再运行 `/mnt/d/Python_Projects/claude-code/dist/cli.js`
