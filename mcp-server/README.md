# Represt MCP Server

独立 MCP 服务，使用官方 MCP TypeScript SDK v2，通过 Streamable HTTP 调用真实 Represt API，支持 Node.js 与 Cloudflare Worker。用户使用已有 Represt 账号完成 OAuth 授权，客户端保存和刷新凭证；服务不保存用户 refresh token。架构与工具契约见 [architecture.md](docs/architecture.md)，线上地址、三个客户端设置与验证范围见 [deployment.md](docs/deployment.md)。

训练分析直接使用 `query_training_analytics`：`workout_summary` 一次取得逐组明细、历史计划完成率与上次同类训练，`compare:previous_period` 同次提供前一等长范围对比。默认发现三个工具；原始表与指南工具保留调用兼容。参数和指标见 [analytics.md](docs/analytics.md)，性能测量见 [performance.md](docs/performance.md)。

| 条件 | 要求 |
| --- | --- |
| Node.js | 22.16 以上；部署与 CI 使用 24 |
| 后端 | 配套 `represt-worker`，包含 OAuth 迁移 `0005_mcp_oauth.sql` |
| 数据 | 用户先在 Represt 中手动同步；MCP 读取云端快照，写入云端计划后仍需手动同步回设备 |
| 地址 | Worker 的 `MCP_RESOURCE_URL` 与本服务 `MCP_PUBLIC_URL` 完全相同，包括路径和尾斜杠 |
| 凭证 | 复用 Worker 已有 `BETTER_AUTH_SECRET`；MCP 服务只使用公钥验证 OAuth token |

## 本地运行与验证

先在 Worker 仓库执行 `npm ci`、`npm run db:migrate:local`；在未提交的 `.dev.vars` 中配置已有 `BETTER_AUTH_SECRET` 和 `MCP_RESOURCE_URL=http://127.0.0.1:3001/mcp`，然后执行 `npm run dev`。本地 API 默认使用端口 8787。

在当前 `mcp-server` 目录执行：

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

| 环境变量 | 作用 |
| --- | --- |
| `MCP_PUBLIC_URL` | 客户端连接地址及 OAuth audience；本地示例 `http://127.0.0.1:3001/mcp` |
| `REPREST_API_BASE_URL` | 固定 Represt API origin，例如 `http://127.0.0.1:8787`；不接受客户端指定上游 |
| `HOST` / `PORT` | 默认 `127.0.0.1` / `3001`；容器设 `HOST=0.0.0.0` |
| `MCP_ALLOWED_ORIGINS` | 可选的浏览器 Origin 列表，以逗号分隔；不携带 Origin 的原生 MCP 客户端可直接连接 |
| `REPREST_WORKER_DIR` | 集成测试使用的后端仓库路径；默认当前目录的 `../../represt-worker` |

```powershell
npm run build
npm test
npm run test:integration
```

集成测试在临时 Miniflare 实例中运行实际 Worker、D1、R2 和全部迁移；通过真实业务 API 创建隔离测试账号与训练夹具，再用官方 SDK 客户端完成 OAuth 与 MCP 调用。运行结束清理实例，不连接生产数据库，不替换业务接口。

要额外测试实际 Codex CLI，使用已登录的本地 Codex：

```powershell
$env:REPREST_TEST_CODEX = '1'
$env:REPREST_CODEX_BINARY = (Get-Command codex).Source
npm run test:integration
```

该测试将 OAuth 签发的临时凭证通过子进程环境变量提供给 Codex，仅允许调用读取计划工具，不修改全局配置。SDK 测试覆盖完整 OAuth 流程；Codex 测试验证其真实 Streamable HTTP 工具连接。ChatGPT、Claude 的公网登录回调需在部署后分别验收。

## 公网部署与连接

当前部署入口为 `https://share.represt.app/mcp`。`wrangler.jsonc` 定义独立 `represt-mcp` Worker；现有 API Worker 通过 `REPREST_MCP` Service Binding 转发 MCP 和资源发现，MCP Worker 通过 `REPREST_API` 调用固定 Represt API。更新执行 `npm run build`、`npm test`、`npm run test:integration`、`npx wrangler deploy`。同一 MCP 地址的 HTML GET 提供连接说明，`/mcp/downloads/represt-plugin.zip` 提供插件配置包；POST 保持标准 OAuth MCP 调用。

下表是部署到其他 HTTPS 主机时的操作约定：

| 顺序 | 操作 |
| --- | --- |
| 1 | 为 MCP 服务确定 HTTPS 地址；后端 `wrangler.jsonc` 的 `vars.MCP_RESOURCE_URL` 设置为该地址；保留现有认证 Secret |
| 2 | 在 Worker 仓库执行 `npx wrangler d1 migrations apply represt-share --remote`，再部署 Worker；本项目不会自动执行这两项生产操作 |
| 3 | 在本目录执行 `docker build -t represt-mcp .`；向容器传入 `MCP_PUBLIC_URL`、`REPREST_API_BASE_URL`，将 3001 端口接到 HTTPS 反向代理 |
| 4 | 代理保留原始 `Host`，关闭响应缓冲并允许请求范围内的 SSE；`GET /healthz` 用于健康检查 |
| 5 | 验证公开的 `/.well-known/oauth-protected-resource`，以及 Worker 的 `/.well-known/oauth-authorization-server/api/auth` 和 `/api/auth/jwks` |
| 6 | 在 AI 客户端添加 Streamable HTTP 地址，使用 OAuth 登录；仅分析训练时只授予 `training:read`，需要修改时额外授予 `plans:write` |

Codex 可以通过 `codex mcp add represt --url https://你的MCP域名/mcp` 添加，再执行 `codex mcp login represt`。ChatGPT 和 Claude 在各自支持远程 MCP 的连接设置中添加同一 URL。客户端或组织需已开放该能力；服务不要求把密码或长期 token 粘贴到聊天。

服务支持 OAuth 动态客户端注册，授权码只能使用一次，公开客户端强制 S256 PKCE。访问令牌有效期 5 分钟；`offline_access` 授权允许客户端通过 Better Auth 轮换刷新凭证。每次受保护 MCP 请求通过 `/api/account/oauth-status` 复核会话、客户端与同意状态；删除授权同意、禁用客户端或结束对应会话后立即拒绝原令牌。单独撤销刷新令牌后，已签发 JWT 的剩余寿命最多 5 分钟。

服务默认只监听本机地址；公开部署使用 HTTPS。生产启动失败会直接报告配置缺失，所有私有响应使用 `no-store`，访问令牌只经 Authorization 头传递。
