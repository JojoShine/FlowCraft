# 文档与绘图中心：本地验证记录

范围：owner 编辑、项目 viewer 阅读；独立文档、正文目录、原生 Excalidraw、嵌图、自动保存、历史、回收站与导出。文档列表平铺，没有页面树。未更新生产、未推送/合并 GitHub；保留现有生产 MinIO 和部署配置。

## 已运行验证

Node 20.19.5：服务端 9 个单元测试、26 个数据库/MinIO 集成测试；客户端 39 个单元/组件测试；14 个真实浏览器流程，以及双方构建全部通过。独立性能流程包括正文 1000 段+10 张独立图片+3 张图，以及 500 元素+10 张图片的画布，各采样 30 次保存。

断网草稿、双标签冲突、成功响应丢失重试、401 后换账号/恢复、删除后旧编辑页、跨项目与 viewer 权限、固定旧图、历史恢复、ZIP/源图/SVG/PNG、近 10 MiB 图片、表格剪贴板与块拖动均有实际断言。浏览器流程使用真实的隔离数据库与 MinIO，未在生产 app 添加测试接口。

性能环境：Apple M2 / 24 GiB，Chromium 156；CDP 4 逻辑核、20 Mbps / 50 ms，10 张独立 960×540 JPEG 合计 3.16 MiB。图片首次传输单列，数据就绪后正文约 505 ms、画布约 442 ms可操作；保存 P95 分别约 545 / 381 ms。

发现并通过回归测试修复：克隆标签页复用草稿键、旧账号 401 清理新账号登录、合法大图片无法生成受限预览，以及连续保存重复下载图片拖慢确认。原图坐标/图片不因预览优化而改变。

## 验证限制

真实操作系统中文输入法候选词/输入法切换仍需人工验收；自动化测试证明组合事件跨保存期限时不提交半个词，不能证明所有系统输入法兼容。独立 4 核/8 GiB 设备复测仍需补验，本机结果不能冒充目标机器认证。构建保留现有 Vite 大文件提示；编辑器按路由懒加载，正文嵌图不初始化多个 Excalidraw。

## 执行中的决策（完整记录，按发生顺序）

以下逐条保留执行记录的 Ruling，包括后来被用户范围修正覆盖的旧决策。每条结尾说明代价或限制。

- Task 1: Ruling: Docker Hub fails twice with EOF for postgres:16.6; use cached PostgreSQL 16.15-alpine, same major and newer patch, verified by postgres --version — allows isolated tests without production access — patch-specific 16.6 behavior is not exercised.
- Task 1: Ruling: 55432 is already allocated by another local service; isolated PostgreSQL uses 127.0.0.1:55439 — prevents touching existing databases — test commands must use the new port.
- Task 5: Ruling: undelete falls back to root when an active parent has since moved too deep, in addition to missing/deleted parent — preserves five-level invariant — original parent location is not retained in that case; UI receives restoredAtRoot.
- Ruling: remove page hierarchy from schema, services, tests, spec, and plan; keep a flat project document list and per-document outline — user explicitly rejected hierarchy — prior Task 5 tree/depth rulings are superseded, with no remaining product cost.
- Ruling: regenerate the unreleased additive migration and rebuild only the disposable local test database — these migrations have never been deployed and test data are temporary — local fixtures are discarded; no user or production data are touched.
- Task 7: Ruling: logout is in Topbar, not Sidebar; Topbar invokes AuthContext.logout directly and needs no navigation change. AuthContext now awaits guards before clearing credentials — avoids unrelated Sidebar edits — rejected guards keep the user signed in.
- Task 9: Ruling: add @types/jsdom 21.1.7 for strict TypeScript compilation of the planned jsdom runtime — plan omitted required declarations — no runtime behavior change. Excalidraw fonts are copied from the locked package before dev/build, never fetched from an external CDN.
- Task 10: Ruling: bring forward Task 12 content-test Vite mode to perform Task 10 real-browser validation safely — port 5174 proxies only isolated API 3801; default dev and production modes unchanged — test commands must opt into content-test. Temporary UI seed is guarded loopback *_test only, no environment files.
- Task 10: Ruling: local UI port 5174 is already occupied; content-test uses 5179 instead — avoids interrupting another local service — browser tests/runbook must use 5179.
- Task 10: Ruling: bring forward the planned isolated Playwright/runtime harness for real-browser integration verification; test users/projects are random and fixture-cleaned, separate from the visible local preview account — prevents interfering with user preview — remaining Task 12 acceptance/performance cases are still pending.
- Task 11: Ruling: each editor mount gets a fresh draft session ID; refresh recovers prior-session records by account/project/entity instead of reusing sessionStorage ID — cloned browser tabs copy sessionStorage and the previous strategy overwrote one draft (reproduced RED) — refresh uses a new key; old records are removed after confirmed recovery save, and unrelated sessions remain recoverable.
- Task 12: near-limit valid PNG browser regression failed: original 9 MiB image base64 exceeded the independent 10 MiB preview SVG cap (HTTP 413). Ruling: downsample preview raster copies within a 4 MiB aggregate budget, preserving original assets, coordinates and native export bytes — valid source images must remain exportable without increasing server preview parsing limits — previews of large screenshots may have less detail; editable originals remain full quality.
- Task 12: Ruling: local host has more than 4 cores/8 GiB; CDP reports 4 logical cores and enforces 20 Mbps/50ms network, but cannot restrict physical memory or equate CPU performance to an unspecified reference machine — report actual hardware and measured baseline, do not claim exact 4-core/8-GB hardware certification — target hardware sign-off remains a release check.
- Task 12: Ruling: runtime.ts plus direct runner-only Prisma fixtures replace the planned run-e2e.ts/fixture HTTP routes — same isolated API, fewer production-import risks, no test endpoints in app — fixtures must be created by the test runner. Real DOM Chinese composition, native clipboard table paste, narrow reading are automated; authentic OS IME candidate selection is not certified by synthetic composition events and remains an explicit human release check.
- Final: Ruling: production deployment/database drift set aside by reviewer — no production access is authorized in this local-only task — real drift/backup/rollout remain release checks.
- Final: Ruling: authentic OS IME candidate behavior set aside by reviewer — DOM composition, clipboard, drag and narrow reading passed; OS candidate selection requires human verification — platform-specific IME issues could remain.
- Final: Ruling: exact four-core/eight-GB hardware certification set aside by reviewer — actual M2/24GiB measurements and CDP settings are disclosed — target-machine performance remains unverified.
- Final: Ruling: pre-existing authentication fallback secret set aside by reviewer — not changed in this scoped feature patch; new export signing refuses missing JWT_SECRET and release guidance requires preserving configured secret — legacy authentication risk when misconfigured remains outside this patch.

## 独立评审

独立评审：gpt-6-astra / high，审阅基线 c0108d4..ab1caf3，结论 With fixes；未发现确认的 Critical，提出 3 个 Important 和 1 个 Minor。按约定完成一次修复，不另派第二轮审阅。

| 重要问题 | 修复及验证 |
| --- | --- |
| 400/413 后一直重发被拒绝的旧内容 | 明确拒绝时清除旧尝试；网络不确定失败仍复用回执。saveQueue 两种状态回归 RED→GREEN，真实浏览器验证空标题改正后保存成功 |
| 慢保存结束后新内容不再自动提交 | 成功确认后若仍有新草稿，重新安排保存；保留组合输入和暂停保护。11 秒请求/过期定时器回归 RED→GREEN |
| 历史对比缺少图片/附件读取 | 增加按账号和版本隔离的授权读取并释放对象 URL；组件回归 RED→GREEN，浏览器确认旧版本已移除的图片可见、附件字节完整 |

轻微问题暂缓：退出登录时可能重新产生一份已保存/已清除内容的草稿，之后多一次恢复提示。恢复仍需主动确认并检查版本；没有自动覆盖。修复后的完整套件和构建均通过，源码保留在本地分支。

评审未判断的事项已分别记录在上述完整 Ruling 清单：生产漂移/发布、真实 OS 输入法、精确目标硬件，以及本分支之前已有的认证回退 secret 行为。新导出签名缺少 JWT_SECRET 时拒绝运行。

## 本地证据

被忽略的 deploy/local-review/ 内包含两个构建归档、SHA256SUMS、manifest.json、evidence/verification.log、browser-results.json、performance-baseline.json 和桌面/窄屏截图。它们不包含 .env 或 node_modules；构建包不能替代目标环境的 npm ci、prisma generate、备份和迁移审阅。

迁移与回退步骤见 [发布准备](document-drawing-release.md)。没有执行任何生产预检、备份、迁移或发布；发布须另行指示。
