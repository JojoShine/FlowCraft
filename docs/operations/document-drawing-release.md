# 文档中心与绘图中心：本地验证及发布准备

本分支仅完成本地开发，不包含上线授权。生产继续使用现有 MinIO、部署配置、Node 20.19.5；不得将测试配置或测试凭据复制到生产。

## 使用范围

文档中心与绘图中心是独立导航。每篇 Markdown 对应一篇独立文档，按项目平铺展示；正文标题生成文章目录，没有父子页面、页面树或层级限制。owner 编辑，绑定该项目的 viewer 阅读；首版不包含多人实时协作。

文档支持 Markdown 导入为新文档、常用块/表格/代码/图片/附件、文档链接、绘图嵌入、自动保存、本地草稿和历史版本。图使用原生 Excalidraw，可导入为新图，保留元素、连线和图片；文档可跟随最新图或固定版本。历史正文使用当时的绘图快照；恢复正文不会回滚共享原图。回收站操作仅影响选中的对象。

编辑后的本地草稿约 500 ms 写入 IndexedDB；停止输入约 2 秒保存，连续编辑至多 10 秒发起一次保存。组合输入期间不提交。保存冲突必须明确处理；网络失败重试使用同一请求回执，避免重复版本。浏览器清理数据会移除尚未同步的本地草稿，应先同步或导出恢复草稿。

ZIP 包含 document.md、相对路径资产、相同快照的 SVG 与可编辑 .excalidraw。导出固定 15 分钟快照且重新鉴权；viewer 只能导出当前可见内容。原始资源合计超过 100 MiB 时可分别导出正文和源图。大图片预览会缩小，原始图片和源图文件保持完整。缺预览时 owner 补生成同版本预览，viewer 得到明确重试原因；不会产生缺文件的成功 ZIP。

## 隔离本地环境

在无 server/.env、.env 的隔离工作目录运行，切勿从生产主检出复制 .env。

```sh
docker compose -f compose.content-test.yml up -d
npm --prefix server ci
npm --prefix client ci
DATABASE_URL='postgresql://flowcraft_test:local-test-only@127.0.0.1:55439/flowcraft_test' npm --prefix server run db:generate
DATABASE_URL='postgresql://flowcraft_test:local-test-only@127.0.0.1:55439/flowcraft_test' npm --prefix server exec -- prisma migrate deploy
npm --prefix server run dev:content-test
npm --prefix client run dev -- --mode content-test --strictPort
```

接口只监听 127.0.0.1:3801；前端 http://127.0.0.1:5179/flowcraft/ 只代理隔离接口。测试 PostgreSQL 为 16.15-alpine，端口 55439；MinIO 为 RELEASE.2025-04-22T22-12-26Z，端口 19000。tmpfs 测试数据随容器清理，不接触生产卷。

测试 runner 直接创建随机用户/项目并清理自己的数据；生产 app 没有 fixture 接口。测试入口拒绝环境文件，URL 必须 loopback、数据库名以 _test 结尾、桶名以 flowcraft-test- 开头。

```sh
npm --prefix client exec -- playwright install chromium
npm --prefix server test
npm --prefix server run test:integration
npm --prefix client test
npm --prefix client run test:e2e
npm --prefix server run build
npm --prefix client run build
npm --prefix client run test:performance
```

预览字体随锁定的 Excalidraw 包复制到 public/excalidraw，无运行时字体 CDN。测试报告在 client/test-results，失败保存截图与 trace；性能报告附件包含原始 30 次采样和图片首次传输时长。

## 验收证据与边界

| 范围 | 验证入口 |
| --- | --- |
| 新建、表格、嵌图编辑、刷新、历史恢复，原图不被回滚 | workflow.spec.ts |
| 中文组合输入超过保存期限、原生剪贴板表格粘贴、块拖动、窄屏目录 | editing.spec.ts |
| 断网离开后恢复、双标签冲突、丢失成功响应、401/切换账号、删除后的旧编辑页 | recovery.spec.ts |
| viewer 写入/上传/历史/回收站拒绝、固定旧图、跨项目资产、单篇恢复、项目删除保护 | permissions.spec.ts |
| 浏览器 ZIP 下载、同版本资源、独立浏览器源图图片、接近 10 MiB 图片 | portability.spec.ts |
| 跟随与固定版本、并发图恢复快照、旧资产隔离、不可变版本与回执、配额/上传失败 | server/test/content 与 client/test/content |
| 千段正文+10 图片+3 图，500 元素+10 图片，各 30 次保存 | performance.spec.ts |

2026-10-23 本机 Apple M2 / 24 GiB，Chromium 156，CDP 4 逻辑核、20 Mbps / 50 ms：使用 10 张独立的 960×540 JPEG（合计 3.16 MiB），正文数据就绪后可操作 398 ms、保存 P95 611 ms；画布可操作 450 ms、保存 P95 373 ms。结果是本机测量，不等同于独立 4 核/8 GiB 实机认证。精确目标设备复测和真实系统中文输入法的候选词/切换操作仍须人工验收；自动化组合事件不能证明操作系统输入法完全兼容。

## 旧库迁移前只读核对

仓库原始基线为 8cde088。新增两条迁移：00000000000000_baseline（原库结构）、20261022000100_document_drawing_centers（仅新增内容表及关系）。禁止对已有数据的库执行 db push、migrate reset 或重新执行基线建表 SQL。

1. 取得数据库、MinIO 桶与部署配置的备份，记录当前代码提交/锁文件、PM2 和 Nginx 配置、备份位置及校验值。在隔离环境试恢复，确认资产字节可读。
2. 从 8cde088 提取原始 schema.prisma，保留审阅记录。显式提供目标连接到只读预检脚本；它不加载 .env，所有连接设置 default_transaction_read_only=on，只输出结构差异及已完成迁移名，不自动 resolve/apply。

```sh
git show 8cde088:server/prisma/schema.prisma > /safe/review/baseline-8cde088.prisma
# 在受控环境设置 CONTENT_PREFLIGHT_DATABASE_URL，避免将密码写进共享脚本/日志。
npm --prefix server run content:schema-preflight -- --baseline /safe/review/baseline-8cde088.prisma
```

3. 任意未解释的结构差异必须先核实。脚本的 baselineCanBeMarked 只表示结构相同且没有已完成迁移，不代替备份、权限及迁移历史的人工核对。失败、未完成或手工修改过的迁移记录也需人工解释。
4. **仅在获得发布指令、只读 diff 为空、确认旧库没有 migration history 后**，才允许在正确的生产环境标记基线，再应用新增迁移：

```sh
npm --prefix server exec -- prisma migrate resolve --applied 00000000000000_baseline
npm --prefix server exec -- prisma migrate deploy
```

5. 锁文件 npm ci，显式 prisma generate，Node 20.19.5 两侧构建。保留生产 MinIO 连接、JWT_SECRET、数据库 URL、AI 和部署配置；不要用测试账号、桶或端口替换。检查 Nginx 请求体/超时可支持 20 MiB 附件和绘图请求，MinIO 与数据库备份策略覆盖新增资产。
6. 发布前准备前端 dist、服务端 dist + package.json/package-lock.json + prisma/migrations/schema.prisma；校验归档 SHA-256，保留可恢复的旧产物。检查应用基础路径 /flowcraft/ 和字体资源可读。
7. 获授权后才执行发布，验证进程、健康端点、公网登录、owner 保存/刷新/历史与 viewer 只读、图片、ZIP 和源图下载；确认新数据进入备份。

## 回退

回退应用代码/前端到已备份版本，恢复原有部署配置，保留新建内容表、不可变 revision 和 MinIO 对象。旧版应用不展示新模块，但不得通过回退脚本删除新数据。已有 project 外键保护仍应保留，避免旧项目删除路径级联损坏内容。需要恢复整个数据库时先停止写入并核对备份时间，数据库和 MinIO 必须按一致时间点恢复；这是独立的操作决策，本分支未执行。

本地审阅包放在被忽略的 deploy/local-review/，仅含构建结果、包清单和迁移，不包含 .env、node_modules 或测试用户；最终校验值见该目录 SHA256SUMS。此目录不代表已经发布。
