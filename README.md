# OgCloud 销售赋能原型（anquan）

一套「零构建」纯静态高保真原型 + 可选云端后端，用于销售一键背调（客户画像 / 需求匹配 / 切入建议）。

- 前端：纯 HTML/CSS/JS，**双击 `public/index.html` 即可运行**（无需 Node、无需服务器、无需联网）。
- 本地后端：`server/server.js`（Node，`/api/*` 代理大模型）。
- 云端后端：`functions/`（Cloudflare Pages Functions，部署到 GitHub + Cloudflare 后自动可用）。

> 仓库已用 `.gitignore` 屏蔽所有密钥（`server/.env`、`server/config.json`、`.dev.vars`、`.workbuddy/` 等），**请确认这些文件不会被提交**。

---

## 一、目录结构

```
anquan/
├─ public/                 # ★ 静态站点（部署到 Cloudflare 的就是它）
│  ├─ index.html           # 登录/入口
│  ├─ app.html             # 主应用（SPA）
│  └─ assets/              # css / js（数据、视图、核心逻辑）
├─ server/                 # 本地开发后端（Node，不部署；云端用 functions/）
│  └─ server.js
├─ functions/              # ★ 云端后端（Cloudflare Pages Functions）
│  ├─ api/[[path]].js      #   /api/* 统一入口
│  └─ lib/baidiao.js       #   背调核心逻辑（与 server.js 等价，读 env 配置）
├─ wrangler.toml          # Cloudflare Pages 配置（构建输出目录 = public）
├─ .dev.vars.example      # 本地 wrangler dev 用的环境变量样例
└─ README.md
```

前端调用的接口：**`/api/config`(GET)**、**`/api/config/test`(POST)**、**`/api/baidiao`(POST)** —— 本地与云端路径完全一致，前端无需任何改动。

---

## 二、本地运行（双击 / Node）

**方式 A：直接双击**
打开 `public/index.html`（登录页）→ 选角色 → 进入 `app.html`。

**方式 B：带本地后端（AI 背调可用）**
```bash
# 1) 复制环境变量样例并填写
cp server/.env.example server/.env      # 填入 LLM_API_KEY 等
# 2) 启动
node server/server.js
# 浏览器访问 http://localhost:4173/
```
本地后端密钥写在 `server/.env`（或「AI 配置」页保存到 `server/config.json`），**绝不进浏览器、不进仓库**。

---

## 三、部署到 GitHub + Cloudflare + 自有域名

### 3.0 你需要提前准备的东西（一次性）

| 项目 | 说明 | 在哪获取 |
| --- | --- | --- |
| **GitHub 仓库** | 新建一个仓库（公开/私有均可） | github.com → New repository |
| **Cloudflare 账号 + Account ID** | Pages 部署目标 | Cloudflare 控制台右下角「账户 ID」 |
| **API Token（Pages Edit + Workers Edit）** | 用于命令行 `wrangler` 部署 | Cloudflare → My Profile → API Tokens → 模板「Cloudflare Pages: Edit」+「Workers Scripts: Edit」 |
| **域名已接入 Cloudflare** | 你已有，自域名在 CF 下 | 域名 → DNS 设置里能看到Zone ID |
| **Zone ID**（域名） | 自定义域名绑定时用 | 域名概述页右侧 |
| **DeepSeek / 通义千问 API Key** | 大模型密钥 | 对应平台控制台 |
| **天眼查 MCP Key**（可选，根治工商不准） | `mcpk2_xxx` | ai.tianyancha.com 免费开通 |

> 不想用命令行也可以：在 Cloudflare 控制台用「连接 Git 仓库」方式部署（见 3.3），密钥在控制台填。

### 3.1 把代码推到 GitHub

```bash
git init
git add -A
git commit -m "OgCloud 销售赋能原型 + Cloudflare Functions 后端"
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```
> 提交前用 `git status` 确认没有 `server/.env`、`server/config.json`、`.dev.vars` 被加进来。

### 3.2 设置云端密钥（Cloudflare Secrets / 环境变量）

在 Cloudflare **控制台 → 你的 Pages 项目 → Settings → Environment variables** 添加：

| 变量 | 是否机密 | 示例 / 说明 |
| --- | --- | --- |
| `LLM_API_KEY` | 🔒 Secret | 你的模型 Key |
| `LLM_BASE_URL` | 普通 | `https://api.deepseek.com/v1` |
| `LLM_MODEL` | 普通 | `deepseek-v4-pro` |
| `SEARCH_PROVIDER` | 普通 | `deepseek`（开联网检索）或 `none` |
| `TYC_KEY` | 🔒 Secret | 天眼查 Key，可选 |
| `TYC_MCP_URL` | 普通 | 默认 `https://mcp.tianyancha.com/v1`，一般不用填 |

命令行方式（需先装 `wrangler` 并 `wrangler login`）：
```bash
npx wrangler pages secret put LLM_API_KEY
npx wrangler pages secret put TYC_KEY
```

### 3.3 部署（二选一）

**A. 控制台「连接 Git」（推荐，最省事）**
Cloudflare → Workers & Pages → 创建 → Pages → 连接 Git 仓库 → 选仓库 →
- 构建命令：**留空（无需构建）**
- 构建输出目录：**`public`**
- 环境变量按 3.2 填好 → 部署。以后 `git push` 自动重新部署。

**B. 命令行 `wrangler`**
```bash
npm i -g wrangler
wrangler login
wrangler pages deploy public        # 部署静态站
# 环境变量/Secrets 用 3.2 的 secret put 或控制台设置
```

### 3.4 绑定自有域名（加速 + HTTPS）

Cloudflare → 你的 Pages 项目 → **Custom domains** → 输入你的子域名（如 `anquan.你的域名.com`）→
按提示在域名 DNS 加一条 `CNAME` 指向 `<项目>.pages.dev`（Cloudflare 通常自动加好）。
稍等证书签发（自动 HTTPS），访问你的域名即可。

> 若走 Cloudflare 全球加速（CDN）：域名本身已在 CF，默认就是加速的；Pages 自带边缘缓存。

### 3.5 可选：让「AI 配置」页在云端也能"保存"

默认云端配置来自 3.2 的环境变量/Secrets。若想在前端页面直接改并持久化：
1. Cloudflare 控制台建一个 **KV 命名空间**（如 `ogcloud-config`）；
2. Pages 项目 → Settings → Functions → KV namespace bindings → 绑定为 **`CONFIG_KV`**；
3. 之后「AI 配置」页的保存会写入 KV（`/api/config` 返回 `kvPersist:true`）。

未绑定 KV 时，页面"测试连接"可用，但"保存"只做校验、不持久化（配置仍走环境变量）。

---

## 四、本地用 Cloudflare 模拟运行（可选）

```bash
cp .dev.vars.example .dev.vars      # 填入真实 Key
npx wrangler pages dev public --binding ...
```
此时本地 `http://localhost:8788/` 走的是 `functions/` 后端，和线上行为一致。

---

## 五、排查

- 报告「天眼查已核验但某字段仍错」：确认 `TYC_KEY` 已设为 Secret 且 `TYC_MCP_URL` 默认；部署后访问一次 `/api/baidiao` 看返回里 `tycNote` 字段。
- 背调报「未配置模型」：`/api/config` 应返回 `configured:true`；否则去 Cloudflare 环境变量补 `LLM_API_KEY`。
- 前端白屏：确认部署的「构建输出目录」是 `public`（不是仓库根），否则 `index.html` 不在站点根。
