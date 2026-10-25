# 线上部署与客户端连接

| 入口 | 当前部署 |
| --- | --- |
| 通用 MCP | `https://share.represt.app/mcp` |
| MCP 健康检查 | `https://share.represt.app/mcp/healthz` |
| 保护资源发现 | `https://share.represt.app/.well-known/oauth-protected-resource/mcp` |
| OAuth issuer | `https://share.represt.app/api/auth` |
| OAuth audience | `https://share.represt.app/mcp` |
| 公开说明 | https://share.represt.app/mcp （浏览器 GET，接受 HTML） |
| 插件包 | https://share.represt.app/mcp/downloads/represt-plugin.zip |
| 服务 | `represt-worker` 通过 Service Binding 转发 `/mcp` 到独立 `represt-mcp`；后者通过绑定调用现有 API |
| 凭证归属 | AI 客户端保存并刷新自己的 OAuth 凭证；MCP 不保存用户 refresh token |

| 客户端 | 连接步骤 | 实际验证 |
| --- | --- | --- |
| ChatGPT | 编辑或创建个人插件，MCP URL 填上表地址，OAuth 选择 DCR；也可导入配置包；由 ChatGPT 发起 Represt 授权，再在对话中启用插件 | 配置包已更新；用户账号中的插件编辑、完整授权与工具调用未验证 |
| Claude | Customize → Connectors → 添加自定义远程 MCP；填 URL，选择 OAuth 和 Register automatically，然后登录 Represt | 尚未执行 Claude 客户端实测 |
| Codex | `codex mcp add represt --url https://share.represt.app/mcp`，再 `codex mcp login represt`；需要修改时授权 `plans:write` | 真实 Codex CLI 公网工具调用通过；使用 SDK OAuth 签发的 token，未改用户全局配置；CLI 自身交互登录未验证 |
| 官方 MCP SDK | 自动发现、DCR、Represt 登录、同意、PKCE 换码、客户端保存凭证、Streamable HTTP 工具调用 | 公网完整流程通过；隔离临时账号与 OAuth 客户端已清理 |

已有连接应使用上表 MCP URL 并重新授权；插件不可编辑时，导入新版配置包建立替代连接。普通网页登录不代表 AI 客户端已连接。源码配置位于 `../plugin/mcp.json`；`npm run build` 从配置生成 ZIP 下载产物。

| 验收范围 | 结果 |
| --- | --- |
| 未授权、错误签名 / issuer / audience、到期 token | 拒绝；401 携带 OAuth challenge |
| 只读与修改权限 | 只读写入 403；允许的修改经真实 API 保存后回读验证 |
| 用户隔离、版本冲突、1005 条历史分页、未改对象 ID、历史不变 | 实际 Worker / D1 / R2 + SDK 集成通过 |
| 聚合查询 | 公网完整 OAuth + SDK 调用八类查询通过；隔离的三组快照统计为一次训练、1440 kg·次；缺失快照正确返回 `NO_DATA`；测试快照、账号与 OAuth 客户端已清理 |
| 授权状态 | 删除同意、禁用客户端或结束对应登录会话后拒绝；MCP 在工具发现与调用前检查状态 |
| 说明页与协议共存 | 浏览器 HTML GET/HEAD 显示说明；MCP POST 继续执行 OAuth 校验；事件流 GET 保持 405 |

部署时先确认两端资源地址完全一致，再部署 Represt API 和独立 MCP。独立服务执行 `npm run build`、`npm test`、`npm run test:integration` 和 `npx wrangler deploy`。生产 smoke 需显式设置 `REPREST_SMOKE_MCP_URL`、`REPREST_SMOKE_API_URL` 后运行 `npx tsx test/production-smoke.ts`，加 `REPREST_TEST_CODEX=1` 可执行临时 Codex 连接检查。`npx wrangler deploy --dry-run --outdir .wrangler/landing-check` 后运行 `node test/worker-page.mjs` 验证实际 Worker 产物和下载内容。

生产 smoke 创建隔离账号和 OAuth 客户端，上传三组训练夹具，验证聚合查询及权限边界；结束时删除该账号的 R2 快照和测试认证数据。运行环境须具备配套 Worker 的远程 D1 与 R2 管理权限，测试不访问其他用户的数据。

参考：[OpenAI 插件 OAuth](https://developers.openai.com/plugins/build/auth)、[插件包配置](https://developers.openai.com/plugins/build/plugins)、[Claude 自定义远程 MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)。
