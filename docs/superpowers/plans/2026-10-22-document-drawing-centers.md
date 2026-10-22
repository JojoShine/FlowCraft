# Document and Drawing Centers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 FlowCraft 实现按项目归属的文档中心和 Excalidraw 绘图中心，完整交付文档嵌图、可靠自动保存、历史版本与只读访问。

**Architecture:** 保持 React/Vite、Express、Prisma/PostgreSQL 和 MinIO。文档和画布分别拥有不可变版本，当前指针、保存回执及引用快照事务提交；前端共享小型保存队列和草稿存储，BlockNote 与 Excalidraw 各有适配器。两个中心通过同项目画布引用集成，不引入实时协作服务。

**Tech Stack:** React 19.2.8、Vite 6.4.3、TypeScript 7.0.2、Prisma 6.19.3、MinIO 8.0.7；新增 BlockNote 0.56.0、Excalidraw 0.18.0；测试使用 Vitest 4.0.18、Supertest、Testing Library、Playwright。

**Spec:** [已确认功能设计](../specs/2026-10-22-document-drawing-centers-design.md)。用户已批准当前会话顺序实施、最后统一独立评审；仅本地开发。2026-10-22 补充：文档平铺，一份 Markdown 对应一个页面，标题只生成文内目录，不做父子页面。

## Global Constraints

- 文档与画布必须属于某个项目；独立入口支持汇总自己可访问的项目。
- 查看者使用现有项目邀请创建的 `viewer` 账号，登录后只读访问其绑定项目；只允许项目所有者写内容。
- 第一阶段不提供跨项目移动和引用，不做无需登录的公开分享或多人实时协作。
- 沿用 PostgreSQL、Prisma、MinIO，以及当前 React/Vite + Express 部署方式。
- 内容停止变化 2 秒后自动保存；持续编辑最多间隔 10 秒提交；本地草稿在变化后 500 毫秒写入。
- 保存携带服务器版本号和唯一请求 ID；冲突返回 `409`；旧响应不能将较新草稿标成已保存。
- 每次有实际内容变化且服务器保存成功，生成不可变版本；历史每页 20 条，不自动清理。
- 历史文档中的图固定为当次正文保存时的版本；恢复文档不回滚共享原图。
- 文档正文上限 2 MiB，场景 JSON 10 MiB，单图片 10 MiB，普通附件 20 MiB；图片二进制不计入场景上限。
- 单次文档 ZIP 导出原始关联资源最多 100 MiB，流式输出并使用受限并发。
- 文档平铺展示，不提供父子页面、页面层级或子树操作；正文标题正常生成目录。回收站不自动过期，不提供永久删除。
- 既有项目有新文档或画布（含回收站）时，拒绝直接永久删除项目。
- 保持现有统一响应结构：新接口超限 `413`、未登录 `401`、无写权限 `403`；无权读取按不存在处理。
- 不恢复旧的待办/文档实现，不改产物与现有搜索接口契约，不进行 Next.js/OSS 迁移。
- 不将现有 `server/.env` 用于测试；所有写入测试仅连接本地隔离数据库及测试 MinIO。
- 生产 Node.js 20.19.5 保持不变。开发可用本地 Node 24，但至少一次完整构建和测试在 Node 20.19.5 上验证。
- 本计划的开发执行不包含生产发布授权；最终先准备可审阅迁移、构建包与验证结果，再按用户发布指令上线。

## Review Focus

1. 中文输入法组合输入跨过自动保存期限时，不应提交半个组合词；Task 7 的 `composition_defers_server_save` 与 Task 12 的人工输入法检查覆盖。
2. 上传进行中退出并切换账号，旧请求完成也不能挂到新账号或显示已保存；Task 7 的 `late_upload_after_identity_change_is_ignored` 覆盖。
3. 原图恢复与正文保存同时发生，历史引用必须落到确实存在的一个不可变版本；Task 4 的 `snapshot_survives_concurrent_drawing_restore` 覆盖。
4. 删除与恢复仅影响选中的文档，不影响同项目其他文档；Task 5 生命周期测试覆盖。
5. 导入的 SVG、外链与中文多字节大内容不能绕过展示隔离或体积限制；Task 6 的 `utf8_bytes_enforce_limits`、Task 11 的 `svg_export_removes_active_and_external_content` 覆盖。

---

## 0. 执行环境、依赖及文件职责

### 0.1 工作目录与基线

执行前使用 using-git-worktrees 验证或创建隔离工作目录，从本设计分支已提交的计划开始。保留 `master` 与 GitHub 基线 `8cde088`，不在 master 上实现。先检查工作树、现有提交与本计划的执行记录，已完成任务不得重复实现。

仓库没有现成测试配置或 Prisma 迁移目录。Task 1 同时建立隔离测试和迁移基线，不单独建立与功能无关的工具链项目。测试服务器导入 `server/src/app.ts`，不运行包含报告定时器的 `index.ts`。

### 0.2 已查询的依赖版本

2026-10-22 只读查询官方 npm 元数据，确认以下版本。执行时使用 `--save-exact` 并提交双方锁文件，不能通过更新现有其他依赖来消除安装警告。

| 位置 | 新增依赖 |
| --- | --- |
| client 运行 | `@blocknote/core@0.56.0`、`@blocknote/react@0.56.0`、`@blocknote/ariakit@0.56.0`、`@excalidraw/excalidraw@0.18.0` |
| server 开发 | `vitest@4.0.18`、`supertest@7.3.1`、`@types/supertest@7.2.1` |
| client 开发 | `vitest@4.0.18`、`jsdom@26.1.0`、`fake-indexeddb@6.2.6`、`@testing-library/react@16.3.3`、`@testing-library/dom@10.4.2`、`@testing-library/user-event@14.6.8`、`@playwright/test@1.64.1` |
| server 运行，Task 9 | `dompurify@3.4.13`、`jsdom@26.1.0`，用于受控 SVG 净化；Task 11 的流式 ZIP 复用已有 `archiver` |

不用 `vitest@latest` 和 `jsdom@latest`：查询时其最新版本分别要求 Node 22.12+ 和 22.22.2+。选定版本兼容 Node 20；BlockNote 与 Excalidraw 的 React peer 范围包含 React 19。BlockNote 不启用协作 provider 或 XL 套件；必要的上游内部依赖随锁文件安装，不建设协作服务。

版本依据为官方 npm 的对应包版本元数据，例如 [Excalidraw 0.18.0](https://registry.npmjs.org/@excalidraw%2fexcalidraw/0.18.0)、[Vitest 4.0.18](https://registry.npmjs.org/vitest/4.0.18)、[jsdom 26.1.0](https://registry.npmjs.org/jsdom/26.1.0)。

### 0.3 文件地图

| 位置 | 职责 |
| --- | --- |
| `server/src/content/contracts.ts`, `validation.ts` | 持久化 JSON、DTO、格式版本、规范化与容量验证 |
| `server/src/content/authorization.ts`, `revisions.ts` | 项目权限、事务重试、摘要与保存回执 |
| `server/src/content/assetService.ts`, `assetAccess.ts` | 不可变 MinIO 资产、上传及可见引用鉴权 |
| `server/src/content/drawingService.ts`, `documentService.ts`, `referenceResolver.ts` | 两类内容、版本、恢复及文档嵌图解析 |
| `server/src/content/lifecycleService.ts`, `preferences.ts` | 复制、回收站、个人偏好 |
| `server/src/content/exportService.ts`, `markdownExport.ts`, `sceneExport.ts`, `sanitizeSvg.ts` | 固定快照、流式 ZIP、源图和安全展示文件 |
| `server/src/routes/documents.ts`, `drawings.ts`, `contentAssets.ts`, `contentPreferences.ts` | 路由与输入验证；不混入服务端保存算法 |
| `client/src/features/content/` | DTO/API、保存队列、草稿、保存状态、冲突、历史/回收站界面、资产及个人偏好 hooks |
| `client/src/features/documents/` | BlockNote 适配、文档列表、文内目录、链接块、模板、Markdown 导入 |
| `client/src/features/drawings/` | Excalidraw 适配、列表卡片、只读查看、选择器、嵌图块、模板及预览生成 |
| `client/src/pages/{Documents,DocumentPage,Drawings,DrawingPage}.tsx` | 两中心入口与编辑页装配 |
| `server/test/content/`, `client/test/content/`, `client/e2e/content/` | 服务端、前端状态机与真实浏览器验收 |
| `server/prisma/migrations/`, `docs/operations/document-drawing-release.md` | 旧库迁移基线、增量迁移与发布/回退操作说明 |

现有 `App.tsx`、`Sidebar.tsx`、`Layout.tsx`、`AuthContext.tsx`、`services/api.ts` 仅作接入所需的修改，不进行旁支重构。

## 1. 跨任务接口契约

### 1.1 传输类型（Task 1 定义，后续不得私自改名）

`ContentKind = 'document' | 'drawing'`；`Actor = { id: string; role: string; projectId: string | null }`。

| 名称 | 字段与含义 |
| --- | --- |
| `DocumentBody` | `{ formatVersion: 1; blocks: BlockJSON[] }`；块 JSON 采用已注册的 BlockNote 类型白名单 |
| `DrawingScene` | `{ formatVersion: 1; elements: ElementJSON[]; appState: PersistentAppState; files: Record<string, {assetId: string}> }`；不含二进制和瞬时选择/缩放状态 |
| `SaveEnvelope<T>` | `{ baseVersion: number; requestId: string; source: 'auto'\|'manual'; title: string; payload: T }`；`requestId` 为 UUID |
| `SaveAck` | `{ version: number; digest: string; savedAt: string; requestId: string }` |
| `ContentView<T>` | `{ id; projectId; version; title; payload: T; savedAt; canEdit; deletedAt: string\|null }`，所有省略类型的字段在此分别为 string、number 或 boolean，不增加另一份权威正文 |
| `DrawingReference` | `{ blockId: string; drawingId: string; mode: 'latest'\|'pinned'; revision: number\|null }`，固定引用必须提供版本 |
| `ResolvedEmbed` | `{ blockId; drawingId; revision; title; scene: DrawingScene\|null; previewAssetId: string\|null; status: 'ready'\|'preview-pending'\|'deleted'\|'unavailable' }` |
| `ContentContext` | `{ kind: ContentKind; id: string; revision?: number; documentId?: string; blockId?: string }`，用于资产及历史读取鉴权，不接受客户端指定任意 MinIO 对象键 |
| `AssetUpload` | `{ projectId: string; category: 'image'\|'attachment'\|'preview'; file: multipartFile }`；返回 `{ id; mimeType; bytes; state:'complete' }` |
| `DraftKey` | `{ userId; projectId; kind; id; sessionId }`；全部为 string，`kind` 同 ContentKind |
| `LocalDraft<T>` | `{ key: DraftKey; baseVersion; localSequence; title; payload:T; pendingFiles: BlobDraft[]; updatedAt }` |
| `CreateContentInput<T>` | `{projectId:string;title:string;payload:T}` |
| `ContentListQuery` | `{projectId?:string;q?:string;page?:number;favorite?:boolean;recent?:boolean}`；列表每页 50 条，q 只匹配已约定的当前内容 |
| `Page<T>` | `{items:T[];total:number;page:number;pageSize:number}`；`RevisionPage=Page<RevisionSummary>`，历史固定 pageSize=20 |
| `RevisionSummary` | `{version:number;title:string;savedAt:string;source:'create'\|'auto'\|'manual'\|'restore';restoredFrom:number\|null}` |
| `DocumentRevisionDto` / `DrawingRevisionDto` | `ContentView<DocumentBody>` / `ContentView<DrawingScene>` 加 `digest`、`source`、`restoredFrom`；文档另含引用快照 |
| `AssetDto` | `{id:string;mimeType:string;bytes:number;state:'complete'}` |
| `PreferencePatch` / `PreferenceDto` | 前者为 `{favorite?:boolean;lastViewedAt?:string;viewState?:Record<string,unknown>}`，后者加 kind、entityId；viewState 白名单不包含正文 |
| `BlobDraft` | `{localId:string;fileName:string;mimeType:string;blob:Blob;targetId:string}`；targetId 为正文块 ID 或 Excalidraw fileId |
| `ContentSummary` / `DocumentReferenceDto` | 前者为 `{id,projectId,title,version,updatedAt,previewAssetId?}`；后者为 `{documentId,title,blockId}`，标识和时间均为 string，version 为 number |

`BlockJSON` 的行内格式、表格和子块保留原语义；绘图块属性只包含引用和展示参数。服务端与前端各保留一份 DTO 定义，HTTP 集成测试锁定形状，不为共享类型改造成 monorepo。服务器输出沿用 `{success:true,data,meta?}`；前端现有 axios 已解包一次，新模块使用 `res.data`，不能再访问 `res.data.data`。

### 1.2 数据决策

- `Document`/`Drawing` 保存 `currentVersion` 数字指针、项目、删除状态和派生搜索/预览元数据；当前正文由 `(entityId,currentVersion)` 的不可变 revision 唯一确定。
- revision 保存标题、规范化 payload、digest、时间、保存来源、恢复来源；唯一键 `(entityId,version)`。资产分别用 `DocumentRevisionAsset`、`DrawingRevisionAsset` 关联。
- `DocumentDrawingReference` 以 `(documentRevisionId,blockId)` 唯一，保存绘图 ID、模式及捕获的绘图 revision；反向引用查询只选择当前且未删除的文档版本。
- `ContentSaveReceipt` 以 `(kind,entityId,requestId)` 唯一，保存 actorId、请求摘要和返回版本，连无变化的保存也记录回执；相同请求 ID 换 payload 必须拒绝。
- `ContentPreference` 以 `(userId,kind,entityId)` 唯一，记录收藏、最近访问和视图偏好；不创建内容版本。
- 新内容到 Project 的外键为 `RESTRICT`；不能因项目或内容删除而级联删除历史及资产。用户个人偏好可以随用户删除。
- 新建记录及 revision 1 在同一事务创建。每次有效保存 CAS 更新指针、插入 revision/引用/资产关联及回执；无变化只写回执。恢复总是创建新版本。
- 服务使用 Prisma `Serializable` 事务，`P2034` 最多重试 3 次；每次重试重新鉴权并读取回执。CAS/唯一键保证并发请求不重复提交，回执重放发生在版本冲突判断之前。
- 摘要算法只对对象键排序，保持所有数组顺序、元素 ID、浮点坐标和层级。剔除 Excalidraw 瞬时状态后再算 SHA-256；不能为去重而重排元素层级。

### 1.3 新接口表（Task 6 装配核心路由，Task 9/11 补齐预览与导出）

前缀均为 `/api/v1`；所有接口需要登录。下表写操作均额外验证项目所有者；偏好写入只修改本人。

| 路径 | 方法与行为 |
| --- | --- |
| `/documents`, `/drawings` | GET 权限内列表，POST 创建；省略 projectId 表示汇总权限内项目 |
| `/documents/:id`, `/drawings/:id` | GET 当前内容，PATCH SaveEnvelope，DELETE 移入回收站 |
| `/documents/:id/revisions`, `/drawings/:id/revisions` | GET 所有者历史，固定每页 20 条 |
| `/documents/:id/revisions/:version`, `/drawings/:id/revisions/:version` | GET 所有者历史详情 |
| `/documents/:id/restore`, `/drawings/:id/restore` | POST `{baseVersion,requestId,revision}`，恢复为新版本 |
| `/documents/:id/embeds/:blockId` | GET 从当前正文解析该块；所有者可加 documentVersion 预览历史 |
| `/documents/:id/duplicate` | POST `{drawingMode:'reference'\|'duplicate'}`，只复制当前页 |
| `/drawings/:id/duplicate`, `/drawings/:id/references` | POST 独立副本，GET 当前引用位置 |
| `/documents/trash`, `/drawings/trash` | GET 所有者回收站，静态路由优先于 `/:id` |
| `/documents/:id/undelete`, `/drawings/:id/undelete` | POST 恢复回收站对象，保留 ID |
| `/content-assets` | POST 完成上传；GET `/:id?context=...` 在已验证引用上下文中流式读取 |
| `/content-preferences/:kind/:id` | PUT 本人收藏/最近访问/视图偏好；GET 集合使用项目及种类过滤 |
| `/documents/:id/export-manifest` | POST `{version?:number}` 固定正文、嵌图及资产快照；指定任意历史版本仅所有者可用 |
| `/documents/:id/export` | POST `{snapshotToken:string}`，在重新鉴权后流式输出已冻结快照 ZIP |
| `/documents/:id/export-markdown` | GET 当前正文 `.md`，可选 version 仅所有者可用；不打包图片/附件/原图，明确标识此限制 |
| `/drawings/:id/export` | GET 原生场景与图片数据；可选 version 仅所有者可用 |
| `/drawings/:id/revisions/:version/preview` | PUT 所有者上传该版本预览，核对版本和摘要后净化，不修改场景版本 |

SVG/PNG 及 Markdown 的用户导入先由客户端适配器解析，上传资产后使用创建接口，不增加可任意覆盖当前内容的导入接口。

---

### Task 1: 建立内容契约、数据库版本基础及隔离测试

**Files:** Create `compose.content-test.yml`, `server/vitest.config.mts`, `server/vitest.integration.config.mts`, `server/test/setup.ts`, `server/test/fixtures.ts`, `server/test/content/contracts.test.ts`, `server/test/content/schema.integration.test.ts`, `server/src/content/contracts.ts`, `server/src/content/validation.ts`, `server/prisma/migrations/00000000000000_baseline/migration.sql`, `server/prisma/migrations/20261022000100_document_drawing_centers/migration.sql`, `server/prisma/migrations/migration_lock.toml`; Modify `server/prisma/schema.prisma`, `server/package.json`, `server/package-lock.json`.

**Interfaces:** Consumes existing User/Project and spec. Produces all server DTOs from §1.1; `normalizeDocument(input:unknown):DocumentBody`, `normalizeScene(input:unknown):DrawingScene`, `contentDigest(title:string,payload:DocumentBody|DrawingScene):string`; test fixture `withContentFixture(test:(fx:ContentFixture)=>Promise<void>):Promise<void>`, exposing `owner`, `otherOwner`, `viewer`, `project`, `otherProject`, `db`, `storage`, `body:DocumentBody`, `scene:DrawingScene` and `requestId():string`（UUID）。测试文件内建立 `withOnlyViewportChanged(scene:DrawingScene):DrawingScene` 和 `reversedElements(scene:DrawingScene):DrawingScene` 两个输入变体，前者只加 viewport 状态，后者仅反转元素顺序。

- [ ] **Step 1 — 写失败测试与最小运行入口。** 安装本任务的服务器测试依赖并建立测试脚本：`test` 为 unit、`test:integration` 为独立配置。测试断言非法块/格式拒绝，非 ASCII 内容按 UTF-8 字节计量，视图状态不影响场景摘要且元素重排会影响摘要。

```ts
expect(contentDigest('图', scene)).toBe(contentDigest('图', withOnlyViewportChanged(scene)));
expect(contentDigest('图', reversedElements(scene))).not.toBe(contentDigest('图', scene));
expect(() => normalizeDocument({formatVersion:99,blocks:[]})).toThrow();
```

- [ ] **Step 2 — 运行 RED。** `npm --prefix server test -- test/content/contracts.test.ts`；预期缺少契约/校验函数而失败。测试 fixture 只能使用显式 `TEST_DATABASE_URL` 与 `TEST_MINIO_*`，拒绝非 loopback 地址和不以 `_test` 结尾的数据库名；读取环境前不得加载现有 `.env`。
- [ ] **Step 3 — 定义模型与最小隔离环境。** 按 §1.2 添加模型、索引、外键和持久化格式；Document 和 Drawing 均为独立资源，包含 deletedAt，Asset 包含上传状态和不可变 key。测试 Compose 使用 `postgres:16.6`，绑定 `127.0.0.1:55432`；MinIO 使用 `minio/minio:RELEASE.2025-04-22T22-12-26Z`，绑定 `127.0.0.1:19000`，独立测试账号与 `flowcraft-test-*` 桶。测试数据不连接生产、不复用生产卷。
- [ ] **Step 4 — 生成并审阅迁移。** 用 Git `8cde088:server/prisma/schema.prisma` 建立旧模型基线；使用已安装 Prisma 6 的 `migrate diff --from-empty --to-schema-datamodel baseline.prisma --script` 生成 baseline，再用 `--from-schema-datamodel baseline.prisma --to-schema-datamodel server/prisma/schema.prisma --script` 生成增量 SQL。不得生成删除旧表/旧列的 SQL；真实旧库在未来发布时比对后仅标记 baseline 已应用。
- [ ] **Step 5 — 运行 GREEN。** `docker compose -f compose.content-test.yml up -d --wait`；`npm --prefix server run db:generate`；运行 contracts unit 与 `npm --prefix server run test:integration -- test/content/schema.integration.test.ts`。预期全部通过；integration 验证旧项目记录保留、唯一版本/请求键生效、新外键阻止级联删除。测试 fixture 自动装载本地测试地址，故意传生产形态地址须在任何连接前失败。
- [ ] **Step 6 — Commit。** `git add compose.content-test.yml server/package.json server/package-lock.json server/prisma server/src/content/contracts.ts server/src/content/validation.ts server/test server/vitest.config.mts server/vitest.integration.config.mts && git commit -m "feat: add versioned content schema and isolated tests"`。

### Task 2: 项目权限及不可变资产服务

**Files:** Create `server/src/content/authorization.ts`, `server/src/content/assetService.ts`, `server/src/content/assetAccess.ts`, `server/test/content/assets.integration.test.ts`; Modify `server/src/lib/minio.ts` only to add stream upload without changing existing helpers.

**Interfaces:** Consumes Task 1 models/Actor/ContentContext. Produces `requireContentRead(actor:Actor,projectId:string):Promise<void>`, `requireContentOwner(actor:Actor,projectId:string):Promise<void>`, `uploadContentAsset(actor:Actor,input:AssetUploadInput):Promise<AssetDto>`, `openContentAsset(actor:Actor,assetId:string,context:ContentContext):Promise<{stream:Readable;mimeType:string;bytes:number}>`; `AssetUploadInput` supplies projectId, category, mimeType, originalName, byte count and temporary file stream.

- [ ] **Step 1 — RED 测试。** 覆盖 owner 上传/读回、viewer 写入 403、跨项目 404、上传中/失败资产不可引用、图片 10 MiB/附件 20 MiB 边界、失败上传不删除旧对象。测试用 fx.storage 的独立桶，注入 putObject 中断。

```ts
await expect(uploadContentAsset(fx.viewer, uploadInput)).rejects.toMatchObject({statusCode:403});
expect((await uploadContentAsset(fx.owner, uploadInput)).state).toBe('complete');
```
- [ ] **Step 2 — 运行 RED。** `npm --prefix server run test:integration -- test/content/assets.integration.test.ts`；预期缺少权限/资产服务而失败。
- [ ] **Step 3 — 实现权限和上传。** 服务端按真实 Project.ownerId/Viewer.projectId 校验，拒绝没有绑定项目的 viewer；asset key 使用 `content/<projectId>/<uuid>`，不接受文件名拼接路径。上传采用有上限的临时文件及流，写 MinIO 完成后才标 complete；失败只清理本次新对象/临时文件。记录不可变文件 ID、大小、MIME 和内容摘要。历史资产不可覆盖，不开放匿名桶。
- [ ] **Step 4 — 实现读取范围。** viewer 只有当前活跃内容直接资产或当前文档实际嵌图引用的资产可读；任意历史、孤立上传、删除内容仅 owner 通过对应历史/草稿上下文读取。预览 category 仅由 Task 11 的受限接口创建。只读资产测试 fixture 可以建立关联，不提前建设新通用资产平台。
- [ ] **Step 5 — GREEN。** 重跑本任务 integration，预期全部通过；`npm --prefix server run build` 成功且旧上传接口类型不变。
- [ ] **Step 6 — Commit。** `git add server/src/content/authorization.ts server/src/content/assetService.ts server/src/content/assetAccess.ts server/src/lib/minio.ts server/test/content/assets.integration.test.ts && git commit -m "feat: add project-scoped immutable content assets"`。

### Task 3: 画布保存、回执、历史和恢复服务

**Files:** Create `server/src/content/revisions.ts`, `server/src/content/drawingService.ts`, `server/test/content/drawingVersions.integration.test.ts`.

**Interfaces:** Consumes Tasks 1–2. Produces `drawingService.create(actor:Actor,input:CreateContentInput<DrawingScene>):Promise<ContentView<DrawingScene>>`, `.list(actor:Actor,query:ContentListQuery):Promise<Page<ContentSummary>>`, `.read(actor:Actor,id:string):Promise<ContentView<DrawingScene>>`, `.save(actor:Actor,id:string,input:SaveEnvelope<DrawingScene>):Promise<SaveAck>`, `.history(actor:Actor,id:string,page:number):Promise<RevisionPage>`, `.revision(actor:Actor,id:string,version:number):Promise<DrawingRevisionDto>`, `.restore(actor:Actor,id:string,input:RestoreInput):Promise<SaveAck>`; `RestoreInput={baseVersion:number;requestId:string;revision:number}`. Shared `runContentTransaction<T>(fn:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>` implements bounded serialization retry.

- [ ] **Step 1 — RED 测试。** 断言下面行为，此外验证 no-op 回执重放、相同 requestId 不同 payload 拒绝、标题修改生成版本、view-only 改动不生成版本、恢复相同内容仍生成版本、失败事务无半条历史。

```ts
const results = await Promise.allSettled([
  drawingService.save(fx.owner,drawing.id,inputA),
  drawingService.save(fx.owner,drawing.id,inputB),
]);
expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
expect(results.filter(r => r.status === 'rejected' && r.reason.statusCode === 409)).toHaveLength(1);
```

- [ ] **Step 2 — RED。** `npm --prefix server run test:integration -- test/content/drawingVersions.integration.test.ts`；预期服务不存在而失败。
- [ ] **Step 3 — 实现。** 按 §1.2 执行 owner 鉴权→事务内回执核对→CAS→资产校验→追加版本/资产关系→更新当前指针→记录回执。payload 仅保存持久化场景；新建 revision 1；asset 必须 complete 且同项目。调用无权 read 返回 404，无权 write 返回 403；已删除对象不能保存。历史仅 owner 可访问，列表页长 20；恢复读取原版本后生成新版本并记录来源，不删除后续历史。
- [ ] **Step 4 — GREEN。** 重跑 integration；预期并发恰一成功、历史无缺口/重复、恢复可再次撤回、原图历史图片仍可读。`npm --prefix server run build` 通过。
- [ ] **Step 5 — Commit。** `git add server/src/content/revisions.ts server/src/content/drawingService.ts server/test/content/drawingVersions.integration.test.ts && git commit -m "feat: add reliable drawing versions and restore"`。

### Task 4: 文档保存及历史绘图快照

**Files:** Create `server/src/content/documentService.ts`, `server/src/content/referenceResolver.ts`, `server/test/content/documentVersions.integration.test.ts`, `server/test/content/embedSnapshots.integration.test.ts`.

**Interfaces:** Consumes Task 3 drawing revisions/transaction helper. Produces documentService 的 create/list/read/save/history/revision/restore，签名与 Task 3 对应但 payload 为 DocumentBody；`resolveDocumentEmbed(actor:Actor,documentId:string,blockId:string,documentVersion?:number):Promise<ResolvedEmbed>`；`listDrawingReferences(actor:Actor,drawingId:string):Promise<DocumentReferenceDto[]>`.

- [ ] **Step 1 — RED 测试。** 创建 latest 和 pinned 引用并修改原图；当前 latest 更新、历史图不变；viewer 可读当前固定块但不能枚举任意历史；保存时已存在的删除引用可保留，新插入删除图拒绝。验证 `snapshot_survives_concurrent_drawing_restore`：正文提交与图恢复同时执行，所有捕获 ID 均对应完整不可变版本及有效资产。

```ts
expect((await resolveDocumentEmbed(fx.owner,doc.id,'drawing-block',1)).revision).toBe(1);
expect((await resolveDocumentEmbed(fx.owner,doc.id,'drawing-block')).revision).toBe(2);
await documentService.restore(fx.owner,doc.id,restoreInput);
expect((await resolveDocumentEmbed(fx.owner,doc.id,'drawing-block')).revision).toBe(1);
expect((await drawingService.read(fx.owner,drawing.id)).version).toBe(2);
```

- [ ] **Step 2 — RED。** 运行 `npm --prefix server run test:integration -- test/content/documentVersions.integration.test.ts test/content/embedSnapshots.integration.test.ts`；预期文档服务/解析不存在而失败。
- [ ] **Step 3 — 实现。** 复用事务/摘要规则，正文存格式化块 JSON；在正文事务中提取绘图块并捕获 revision，将实际版本写入 DocumentDrawingReference。恢复时将所有绘图块固定到历史快照，不写 Drawing；直接文档链接仍保存稳定 ID。搜索纯文本从当前正文提取，不能包含历史、外部附件或图片文字。
- [ ] **Step 4 — GREEN。** 重跑两文件及 Task 3 integration；预期各保存状态和快照一致，跨项目构造引用被拒绝，不能用 blockId 查询其他文档的图。构建通过。
- [ ] **Step 5 — Commit。** `git add server/src/content/documentService.ts server/src/content/referenceResolver.ts server/test/content/documentVersions.integration.test.ts server/test/content/embedSnapshots.integration.test.ts && git commit -m "feat: add document versions with stable drawing snapshots"`。

### Task 5: 独立文档的复制、回收站与个人偏好

**Files:** Create `server/src/content/lifecycleService.ts`, `server/src/content/preferences.ts`, `server/test/content/lifecycle.integration.test.ts`; Modify `server/src/services/projectService.ts` delete method only.

**Interfaces:** Consumes Tasks 3–4. Produces `duplicateDocument(actor,id,mode:'reference'|'duplicate')`, `duplicateDrawing(actor,id,revision?)`, `trashContent(actor,kind,id)`, `listTrashContent(actor,kind,query)`, `undeleteContent(actor,kind,id):Promise<{id:string}>`, `setContentPreference(actor,kind,id,patch)` and `listContentPreferences(actor,kind,projectId?)`. Reuse the content DTOs; there are no page hierarchy or move APIs.

- [ ] **Step 1 — RED。** 测试复制文档和画布、删除与恢复单篇文档不影响其他文档、图独立副本固定操作时的可见版本、偏好隔离、删除后旧编辑页不能写回。
- [ ] **Step 2 — RED。** `npm --prefix server run test:integration -- test/content/lifecycle.integration.test.ts`；预期缺少服务而失败。
- [ ] **Step 3 — 实现。** 回收站仅修改选中对象的 deletedAt，保留 ID/版本。复制按 reference/duplicate 规则处理画布，深复制正文但共享不可变资产。个人偏好只关联本人，不改正文当前版本。
- [ ] **Step 4 — 加项目删除保护。** projectService.delete 在事务中检测任何 Document/Drawing（包括软删除），存在即返回 409；新增外键 RESTRICT 作兜底。
- [ ] **Step 5 — GREEN。** 重跑 integration 并构建，验证单篇生命周期、偏好隔离及项目保护。
- [ ] **Step 6 — Commit。** 提交本任务文件和 projectService 的必要修改。

### Task 6: 装配接口、容量边界与前端客户端

**Files:** Create `server/src/routes/documents.ts`, `server/src/routes/drawings.ts`, `server/src/routes/contentAssets.ts`, `server/src/routes/contentPreferences.ts`, `server/test/content/http.integration.test.ts`, `client/src/features/content/types.ts`, `client/src/features/content/api.ts`, `client/test/content/api.test.ts`, `client/vitest.config.ts`, `client/test/setup.ts`; Modify `server/src/app.ts`, `client/src/services/api.ts`, both package/lock files.

**Interfaces:** Consumes Tasks 1–5 and §1.3. Produces `documentsApi`/`drawingsApi` with list/get/create/save/history/revision/restore/duplicate/trash/undelete/resolveEmbed/references as appropriate, `contentAssetsApi.upload(file,projectId,category,signal):Promise<AssetDto>` and `.read(assetId,context,signal):Promise<Blob>`, `contentPreferencesApi`；所有调用返回一次解包后的 DTO。

- [ ] **Step 1 — RED。** Supertest 覆盖接口矩阵、静态 trash 路由先于 id、owner/viewer/其他项目权限、未登录 401、`utf8_bytes_enforce_limits`、错误格式、未来格式不被另存为空白。前端 mock axios 断言 SaveEnvelope/SaveAck 原样往返且只解包一次。

```ts
await request(app).get('/api/v1/documents').expect(401);
await request(app).patch(`/api/v1/drawings/${drawing.id}`)
  .set('Authorization', `Bearer ${viewerToken}`).send(saveInput).expect(403);
```
- [ ] **Step 2 — RED。** 运行本任务 server integration 和 `npm --prefix client test -- test/content/api.test.ts`；预期新路由 404、新客户端不存在而失败。此时安装对应前端测试依赖、建立 jsdom 与 fake-indexeddb 测试 setup。
- [ ] **Step 3 — 路由装配。** 在既有全局 `express.json()` 之前挂载 documents/drawings 的定向 JSON parser，传输 envelope 额外容许 64 KiB，但 payload 分别严格校验 2/10 MiB；后续保持原日志、时区、authenticate 和统一响应。新路由限定的 parser/multipart 超限转换为 413；不得给所有旧 API 放开体积。multipart 按 Task 2 临时文件/流，category 和真实 MIME 再校验。
- [ ] **Step 4 — 客户端。** 将现有 `api` axios 实例导出，新增独立 content/api 文件复用鉴权和错误处理，不搬动旧 API。资产通过带 Authorization 的请求转 Blob URL，组件卸载/换账号撤销；不复制旧接口将 JWT 放进 URL 的方式。types 精确镜像 §1.1。
- [ ] **Step 5 — GREEN。** 两侧本任务测试及 build 全过；检查旧项目/任务/产物端点的响应结构没有变化。server 新错误范围只影响新路由。
- [ ] **Step 6 — Commit。** `git add server/src/app.ts server/src/routes/documents.ts server/src/routes/drawings.ts server/src/routes/contentAssets.ts server/src/routes/contentPreferences.ts server/test/content/http.integration.test.ts client/src/features/content client/src/services/api.ts client/test client/vitest.config.ts client/package.json client/package-lock.json server/package.json server/package-lock.json && git commit -m "feat: expose content APIs with strict access and size limits"`。

### Task 7: 保存队列、离线草稿与退出保护

**Files:** Create `client/src/features/content/saveQueue.ts`, `draftStore.ts`, `useContentAutosave.ts`, `useContentAssets.ts`, `SaveStatus.tsx`, `ConflictDialog.tsx`, `DraftRecoveryDialog.tsx`, `LogoutGuard.tsx`, `client/test/content/saveQueue.test.ts`, `draftStore.test.ts`, `logoutGuard.test.tsx`; Modify `client/src/contexts/AuthContext.tsx`, `client/src/components/layout/Sidebar.tsx` only for awaited logout.

**Interfaces:** Consumes Task 6 API/DTO. Produces `draftStore.put<T>(draft:LocalDraft<T>):Promise<void>`, `.list<T>(userId:string):Promise<LocalDraft<T>[]>`, `.remove(key:DraftKey):Promise<void>`；`createSaveQueue<T>(options:SaveQueueOptions<T>):SaveQueue<T>`，options 为 identity:DraftKey、initialVersion:number、save:(envelope:SaveEnvelope<T>,signal:AbortSignal)=>Promise<SaveAck>、draftStore；queue 提供 `update(title:string,payload:T,pendingFiles:BlobDraft[]):void`, `flush():Promise<SaveAck|null>`, `setComposing(value:boolean):void`, `pause(reason:'auth'|'conflict'|'deleted'):void`, `dispose():void`, `getSnapshot():SaveState`。`useContentAutosave` 是该队列的 React 订阅封装；AuthContext 新增 `registerLogoutGuard(guard:()=>Promise<boolean>):()=>void`，主动 `logout():Promise<void>` 依次等待 guard。

- [ ] **Step 1 — RED。** 使用 fake timers 与受控 Promise 测试 500ms 本地落盘、2s 静默/10s 最长期限、单请求进行中继续编辑、丢失响应重用 requestId、旧响应不清掉新草稿、409 暂停、401 保存旧身份草稿。覆盖 `composition_defers_server_save`、`late_upload_after_identity_change_is_ignored`、QuotaExceededError、并行标签页草稿分开保存。

```ts
queue.update('说明', bodyA, []);
await vi.advanceTimersByTimeAsync(500);
expect(await draftStore.list(ownerId)).toHaveLength(1);
await vi.advanceTimersByTimeAsync(1500);
expect(save).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2 — RED。** `npm --prefix client test -- test/content/saveQueue.test.ts test/content/draftStore.test.ts test/content/logoutGuard.test.tsx`；预期保存队列及草稿接口缺失而失败。
- [ ] **Step 3 — 实现队列与本地恢复。** 各实体/编辑会话最多一个在途保存，待保存内容合并为最新 localSequence；网络失败重试同一请求，不重新分配 ID；响应仅确认该次 localSequence。附件未 complete 不提交正文；上传完成回调校验身份及会话 epoch，旧 epoch 结果忽略。IME 组合输入期间只保留草稿，服务器提交等 compositionend，避免保存半个词。IndexedDB 按账号/项目/对象/会话存 Blob 和基线，刷新恢复 sessionId；切账号不加载旧账号记录。
- [ ] **Step 4 — 实现可见状态和 guard。** SaveState 的 phase 固定为 `saved|dirty|saving|offline|error|conflict|auth-paused|deleted`，另存 localSequence、ackedSequence、version、savedAt、draftPersisted、lastAck:SaveAck|null。主动退出需先同步，失败可导出或返回，不直接清草稿；被动 401 即使卸载也完成以旧身份为 key 的草稿写入。冲突提供读取服务器、副本、再次确认后按最新 baseVersion 提交三个动作；页面离开/关面板检查未保存，刷新仅尽力保护，不声称关闭事件必达。
- [ ] **Step 5 — GREEN。** 本任务三文件测试通过；既有普通登录、登出仍正常；`npm --prefix client run build` 通过。草稿恢复不自动提交到服务器；未来格式进入只读，不能初始化为空白再保存。
- [ ] **Step 6 — Commit。** `git add client/src/features/content client/src/contexts/AuthContext.tsx client/src/components/layout/Sidebar.tsx client/test/content && git commit -m "feat: add durable autosave drafts and conflict recovery"`。

### Task 8: BlockNote 编辑器、文档树和阅读体验

**Files:** Create `client/src/features/documents/DocumentEditor.tsx`, `DocumentList.tsx`, `DocumentOutline.tsx`, `DocumentLinkBlock.tsx`, `DocumentTemplates.ts`, `markdown.ts`, `documentEditor.css`, `client/test/content/documentEditor.test.tsx`, `documentList.test.tsx`, `markdownImport.test.ts`; Modify `client/package.json`, `client/package-lock.json`.

**Interfaces:** Consumes Tasks 6–7. Produces `DocumentEditor({view:ContentView<DocumentBody>,onChange:(title:string,payload:DocumentBody)=>void,onComposition:(value:boolean)=>void,renderDrawing:(block:DrawingReference)=>ReactNode}):JSX.Element`；`DocumentList({items:ContentSummary[],onSelect}):JSX.Element`，onSelect:(id:string)=>void；`parseMarkdown(markdown:string):Promise<{body:DocumentBody;warnings:string[]}>`；`createDocumentTemplate(kind:'blank'|'servers'|'operations'):DocumentBody`。

- [ ] **Step 1 — RED。** 测试 viewer 不能修改复选框/正文，标题目录来自当前块，页面移动不重建正文，Markdown 标题/代码/表格/缺失相对图片保留语义，非法链接不可执行。模板断言服务器七列名称与 spec 一致；复选块不调用 tasksApi。测试端传入 renderDrawing，真实绘图块由 Task 10 装配。

```ts
expect(JSON.stringify(createDocumentTemplate('servers'))).toContain('IP/域名');
const imported = await parseMarkdown('![截图](./missing.png)');
expect(imported.warnings).toHaveLength(1);
```
- [ ] **Step 2 — RED。** 安装三个固定版本 BlockNote 包；运行 `npm --prefix client test -- test/content/documentEditor.test.tsx test/content/documentList.test.tsx test/content/markdownImport.test.ts`；预期缺少组件/适配器而失败。
- [ ] **Step 3 — 实现。** 使用 Ariakit UI，绑定已有主题变量，完成规定的基础块、`/` 菜单、块拖动、常用 Markdown 输入、中文组合事件、代码复制、表格行列编辑、图片/附件与文档链接。新建先等服务器返回稳定 ID 再挂载可编辑态；upload 回调走 Task 7，不让 BlockNote 的外链/base64 暂存 URL 成为权威文件地址。图块由 renderDrawing 注入，正文只持久化引用；收藏、目录展开不进入 body。
- [ ] **Step 4 — 组织与导入。** DocumentList 平铺展示项目文档，支持新建和重命名；DocumentOutline 根据当前正文标题生成目录并跳转。Markdown 中的标题不拆成子页面。三种模板按 spec 创建。Markdown 通过 BlockNote 适配器导入新文档，外部图保留外链并标识，缺失相对文件列出警告，不由服务器抓取 URL。前端选择器仅提供同项目文档，稳定 ID 链接卡片随名称更新、删除后显示占位。
- [ ] **Step 5 — GREEN。** 重跑三测试和 client build；阅读模式验证目录跳转、表格横滚、图片放大、代码复制，手机宽度下正文可读。真实拖动和系统输入法留给 Task 12 浏览器/人工检查，不把 jsdom 结果当成全部编辑体验证据。
- [ ] **Step 6 — Commit。** `git add client/src/features/documents client/test/content/documentEditor.test.tsx client/test/content/documentList.test.tsx client/test/content/markdownImport.test.ts client/package.json client/package-lock.json && git commit -m "feat: add block document editor and flat document list"`。

### Task 9: Excalidraw 编辑、可携带图片和版本预览

**Files:** Create `client/src/features/drawings/ExcalidrawEditor.tsx`, `DrawingViewer.tsx`, `sceneAdapter.ts`, `DrawingTemplates.ts`, `exportPreview.ts`, `useDrawingPreview.ts`, `client/test/content/sceneAdapter.test.ts`, `drawingEditor.test.tsx`, `server/src/content/sanitizeSvg.ts`, `server/test/content/drawingPreview.integration.test.ts`; Modify `server/src/content/drawingService.ts`, `server/src/routes/drawings.ts`, `server/src/content/assetService.ts`, `client/src/features/content/api.ts`, both package/lock files.

**Interfaces:** Consumes Tasks 2–3,6–7. Produces `sceneToPayload(elements:readonly ElementJSON[],appState:Record<string,unknown>,files:BinaryFileMap,assets:Record<string,string>):DrawingScene`（assets 将 Excalidraw fileId 映射为 assetId）；`hydrateScene(scene:DrawingScene,readAsset:(id:string)=>Promise<Blob>):Promise<HydratedScene>`；`importExcalidraw(file:File):Promise<{scene:DrawingScene;pendingFiles:BlobDraft[]}>`；`exportDrawing(scene:HydratedScene,format:'excalidraw'|'png'|'svg'):Promise<Blob>`；`ExcalidrawEditor({view,onChange,onComposition}):JSX.Element`，change/composition 签名与 Task 8 相同但 payload 为 DrawingScene；`useDrawingPreview(input:{id:string;lastAck:SaveAck|null;canEdit:boolean}):{status:'ready'|'pending'|'error';regenerate:(version:number)=>Promise<void>}`。编辑器为受控组件，只有宿主页持有 Task 7 保存队列；预览 hook 依据 ack 读取不可变版本，不从可能已继续编辑的当前画布生成旧版本预览。服务端新增 `saveDrawingPreview(actor:Actor,id:string,version:number,digest:string,svg:Buffer):Promise<AssetDto>`；客户端 `drawingsApi.putPreview(id:string,version:number,digest:string,svg:Blob):Promise<AssetDto>`。

- [ ] **Step 1 — RED。** 场景往返保留元素 ID、坐标、连接、顺序及图片；只移动视图不保存；导入总是创建新图；缺失/超限图片明确失败，不能丢图后显示已保存。server 验证旧版本预览晚到不替换新版本缩略图，预览失败不回退已保存源场景。恶意 SVG 的 script、foreignObject、事件属性及外部引用无法进入受信展示。

```ts
const imported = await importExcalidraw(sourceFile);
expect(imported.scene.elements.map(element => element.id)).toEqual(originalIds);
expect(imported.pendingFiles).toHaveLength(1);
```
- [ ] **Step 2 — RED。** 安装固定 Excalidraw 和服务端净化依赖；运行 `npm --prefix client test -- test/content/sceneAdapter.test.ts test/content/drawingEditor.test.tsx` 与 `npm --prefix server run test:integration -- test/content/drawingPreview.integration.test.ts`；预期适配/预览方法缺失而失败。
- [ ] **Step 3 — 编辑与原生导入导出。** 编辑器懒加载官方组件和本地字体/资源，设置中文、主题和受控只读，禁用外部网页嵌入；不对普通场景变化调用整体重新生成/布局。按 fileId 上传图片，保存 stable assetId 引用，加载时通过鉴权 Blob 重建完整 files。Excalidraw 瞬时状态与持久化属性分离；模板只包含少量服务器/网关/数据库/存储元素及部署图、简单流程。
- [ ] **Step 4 — 预览管线。** 场景服务器确认后才为该 ack 版本生成 SVG，PUT 携带版本及场景摘要；服务端用独立 DOMPurify/jsdom 窗口净化，禁用脚本/事件/foreignObject、外部资源与 CSS URL，不执行输入脚本。图内栅格图片只允许校验后的 data:image 数据；预览以 `<img>`/受限图片方式显示，禁止 dangerouslySetInnerHTML。存为不可变 preview 资产，仅在其版本仍为 currentVersion 时更新当前缩略图；否则只补齐历史预览。
- [ ] **Step 5 — GREEN。** 本任务测试及两侧 build 通过。验证 `.excalidraw` 导出包含图片二进制数据而非 MinIO/Blob/短期 URL；官方导入工具可重新打开导出结果。生成预览失败显示 preview-pending，打开源图仍可用；所有者可对指定历史版本补生成预览，查看者不能上传。
- [ ] **Step 6 — Commit。** `git add client/src/features/drawings client/test/content/sceneAdapter.test.ts client/test/content/drawingEditor.test.tsx client/src/features/content/api.ts server/src/content/sanitizeSvg.ts server/src/content/drawingService.ts server/src/content/assetService.ts server/src/routes/drawings.ts server/test/content/drawingPreview.integration.test.ts client/package.json client/package-lock.json server/package.json server/package-lock.json && git commit -m "feat: add editable Excalidraw scenes and immutable previews"`。

### Task 10: 两中心入口、文档嵌图、历史及回收站界面

**Files:** Create `client/src/pages/Documents.tsx`, `DocumentPage.tsx`, `Drawings.tsx`, `DrawingPage.tsx`, `client/src/features/drawings/DrawingEmbedBlock.tsx`, `DrawingPicker.tsx`, `DrawingCard.tsx`, `client/src/features/content/HistoryPanel.tsx`, `TrashPanel.tsx`, `useContentPreferences.ts`, `useContentScope.ts`, `client/test/content/contentCenters.test.tsx`, `embedsAndHistory.test.tsx`; Modify `client/src/App.tsx`, `client/src/components/layout/Sidebar.tsx`, `client/src/components/layout/Layout.tsx`.

**Interfaces:** Consumes Tasks 6–9. Produces routes `/documents`, `/documents/:id`, `/drawings`, `/drawings/:id` under existing `/flowcraft` basename；`useContentScope():{projectId:string|null;setScope:(id:string|null)=>void}`，null 为两中心本地“全部项目”覆盖，不修改全局 ProjectContext 自动选项目规则；`DrawingEmbedBlock({documentId:string,reference:DrawingReference,canEdit:boolean,onReferenceChange:(value:DrawingReference)=>void}):JSX.Element`；`HistoryPanel({kind,id,beforeRestore,onRestored})` 中 beforeRestore:()=>Promise<boolean>、onRestored:(ack:SaveAck)=>void；`TrashPanel({kind,projectId,onRestored})` 使用 Task 5 恢复结果。

- [ ] **Step 1 — RED。** 测试独立导航、按项目/全部范围、viewer 只读、无项目空态、搜索/收藏/最近访问、绘图网格/列表；同图多处 latest 和 pinned 行为，复制原图只替换本块；历史预览使用 snapshot，恢复后 pinned 且不回滚原图。fixture 同时覆盖已删除、无权限、preview-pending 绘图块占位。

```ts
expect(await screen.findByText('固定版本 v1')).not.toBeNull();
expect(screen.queryByRole('button',{name:'恢复到此版本'})).toBeNull(); // viewer fixture
```
- [ ] **Step 2 — RED。** `npm --prefix client test -- test/content/contentCenters.test.tsx test/content/embedsAndHistory.test.tsx`；预期缺少页面装配而失败。
- [ ] **Step 3 — 装配页面。** lazy routes 接入现有 Layout；为 document/drawing 子路径正确设置顶部名称和面包屑。文档树、目录、editor 与保存状态联合工作；列表请求使用服务端权限范围。深链接读取到真实项目后仅显示该项目上下文，不能因左栏另选项目而将草稿保存到新项目。大画布页面支持收起既有 AI 面板，不能被默认右栏挤到无法编辑。
- [ ] **Step 4 — 嵌图与生命周期。** `/绘图` 仅选同项目图，新建先创建独立图再插入。默认显示预览，编辑时才挂载单个大编辑器；保存成功刷新本页预览，显示多处引用影响范围。支持固定/最新、图注和展示高度，固定标识使用“固定版本 v{版本号}”；回到页面检查新版本，脏稿不自动刷新覆盖。历史并排预览、“恢复到此版本”前 flush/草稿处理、回收站恢复和稳定 ID 均按 spec 行为，viewer 不显示写/历史入口。
- [ ] **Step 5 — GREEN。** 重跑两测试和 client build；手动走一次服务器模板→表格→建图→嵌图→刷新→历史→恢复流程。复制链接为需要登录的系统内链接，不产生公开 token。
- [ ] **Step 6 — Commit。** `git add client/src/pages/Documents.tsx client/src/pages/DocumentPage.tsx client/src/pages/Drawings.tsx client/src/pages/DrawingPage.tsx client/src/features/drawings/DrawingEmbedBlock.tsx client/src/features/drawings/DrawingPicker.tsx client/src/features/drawings/DrawingCard.tsx client/src/features/content/HistoryPanel.tsx client/src/features/content/TrashPanel.tsx client/src/features/content/useContentPreferences.ts client/src/features/content/useContentScope.ts client/src/App.tsx client/src/components/layout/Sidebar.tsx client/src/components/layout/Layout.tsx client/test/content/contentCenters.test.tsx client/test/content/embedsAndHistory.test.tsx && git commit -m "feat: integrate document and drawing centers with history"`。

### Task 11: 固定快照导出与离线可携带资料

**Files:** Create `server/src/content/exportService.ts`, `markdownExport.ts`, `sceneExport.ts`, `server/test/content/exports.integration.test.ts`, `client/src/features/documents/useDocumentExport.ts`, `client/test/content/documentExport.test.ts`; Modify `server/src/routes/documents.ts`, `server/src/routes/drawings.ts`, `client/src/features/content/api.ts`, `client/src/pages/DocumentPage.tsx`, `client/src/pages/DrawingPage.tsx`.

**Interfaces:** Consumes Tasks 2,4,9–10. Produces `createExportManifest(actor:Actor,id:string,version?:number):Promise<ExportManifest>`，manifest 为 `{snapshotToken:string;documentVersion:number;resourceBytes:number;missingPreviews:Array<{drawingId:string;version:number}>}`；`streamDocumentExport(actor:Actor,id:string,snapshotToken:string,output:Writable):Promise<void>`；`streamMarkdownExport(actor:Actor,id:string,version:number|undefined,output:Writable):Promise<void>`；`streamDrawingExport(actor:Actor,id:string,version:number|undefined,output:Writable):Promise<void>`；`useDocumentExport(id:string):{exportZip:()=>Promise<void>;exportMarkdown:()=>Promise<void>;busy:boolean;error:string|null}`。

- [ ] **Step 1 — RED。** 测试冻结 manifest 后继续改正文/图，ZIP 仍为原版本；当前 pinned 图 viewer 可导出、伪造/过期/跨用户 token 被拒绝，权限撤销/内容删除后不继续导出。检查 100 MiB 超限在输出前拒绝，相对资源路径可读取，源图重开图片完整，不含 JWT、MinIO 或签名 URL。`svg_export_removes_active_and_external_content` 从导入至 ZIP 再次验证净化链路。

```ts
await expect(createExportManifest(fx.viewer, otherDocument.id)).rejects.toMatchObject({statusCode:404});
await expect(streamDocumentExport(fx.owner,doc.id,'tampered-token',output))
  .rejects.toMatchObject({statusCode:403});
```
- [ ] **Step 2 — RED。** `npm --prefix server run test:integration -- test/content/exports.integration.test.ts`、`npm --prefix client test -- test/content/documentExport.test.ts`；预期缺少导出服务/操作而失败。
- [ ] **Step 3 — 冻结与权限。** manifest 在数据库事务中捕获文档版本、各绘图版本及唯一资产清单，精确累加原始资源大小。snapshotToken 是带 purpose=`content-export` 的服务端 HMAC 签名数据，绑定 userId、documentId、版本与清单，15 分钟过期；不是登录凭证，必须在 POST body 传输，不能代替登录。下载时重新校验项目和删除状态，不能用任意 revision/asset 参数扩张清单。这样不新增导出会话表，也能让补预览重试维持同一快照。
- [ ] **Step 4 — 流式组包。** 复用 Archiver，最多两个资源流并发；已冻结 Block JSON 按已支持块映射到标准 Markdown，图片/附件用唯一且防路径穿越的相对路径。每个可见绘图块加入同版本净化 SVG 和 `.excalidraw`；原生源图以可流式的 JSON/base64 输出图内文件，不能同时把所有二进制载入内存。删除图在当前正文导出为占位，不向 viewer 包出已不可见历史场景。首版不做 ZIP 反向导入。
- [ ] **Step 5 — 客户端。** 请求 manifest 后，owner 对 missingPreviews 调用 Task 9 的补生成，再用同 token 下载；viewer 不通过导出绕过上传限制，缺预览时显示可重试原因而不产出缺文件的成功 ZIP。已有预览的正常导出对 viewer 可用。下载中止须取消上游资源流和临时文件；提供单正文 `.md` 与单张图导出作为超限时的明确替代操作。
- [ ] **Step 6 — GREEN。** 两侧本任务测试通过，实际解压 ZIP 并离线打开 `.md` 与原生图；两侧 build 通过。普通未变化资源不复制进新的内容 revision，导出不会改变当前正文、原图或历史。
- [ ] **Step 7 — Commit。** `git add server/src/content/exportService.ts server/src/content/markdownExport.ts server/src/content/sceneExport.ts server/test/content/exports.integration.test.ts server/src/routes/documents.ts server/src/routes/drawings.ts client/src/features/documents/useDocumentExport.ts client/src/features/content/api.ts client/src/pages/DocumentPage.tsx client/src/pages/DrawingPage.tsx client/test/content/documentExport.test.ts && git commit -m "feat: export immutable document bundles and editable drawings"`。

### Task 12: 浏览器验收、性能基线与发布准备

**Files:** Create `client/playwright.config.ts`, `client/e2e/content/fixtures.ts`, `workflow.spec.ts`, `recovery.spec.ts`, `permissions.spec.ts`, `portability.spec.ts`, `performance.spec.ts`, `server/test/run-e2e.ts`, `server/scripts/content-schema-preflight.ts`, `docs/operations/document-drawing-release.md`; Modify `client/vite.config.ts`, both package/lock files, `README.md` only for new module instructions.

**Interfaces:** Consumes all prior tasks and AC-01…AC-17. Produces `npm --prefix client run test:e2e`、`npm --prefix client run test:performance`、`npm --prefix server run content:schema-preflight -- --baseline path/to/baseline.prisma`。schema-preflight 只读读取显式目标 URL，输出差异与基线是否可标记，不自动 resolve/apply 生产迁移。

- [ ] **Step 1 — RED 验收。** 建立 fixture 模拟两个 owner、一个绑定 viewer、独立项目和存储桶。真实 API/浏览器走 spec 全部 17 场景，至少使新建→表格→图片→嵌图→刷新→旧版本恢复、断网恢复、两标签冲突、只读权限、离线导出各有一个断言。保存恢复和权限必须走实际服务，不用全 mock 的端到端测试。

```ts
await page.reload();
await expect(page.getByText('已保存',{exact:true})).toBeVisible();
await expect(page.getByText('固定版本 v1',{exact:true})).toBeVisible();
```
- [ ] **Step 2 — 隔离浏览器环境。** 安装固定 Playwright 开发依赖。测试后端导入 app，端口 3801，不启动 index/定时器；只在测试 runner 装配 fixture 路由，不能进入生产 app。Vite 仅 `--mode content-test` 时代理到 3801，前端端口 5174，生产配置不变；测试 DB/MinIO 仍使用 Task 1 的显式隔离地址。首次执行 `npm --prefix client exec -- playwright install chromium`，不把安装浏览器混入生产构建。
- [ ] **Step 3 — 运行 RED 后修复归属任务。** `npm --prefix client run test:e2e`；预期未覆盖的真实交互或缺失行为明确失败。按失败归属修复相应任务的代码并补最小回归测试，不以降低断言或删掉恢复/权限场景来达成通过。手工补验真实系统输入法、块拖动、表格粘贴和窄屏阅读，截图记录实际页面。
- [ ] **Step 4 — 性能。** 固定 1,000 文本块+10 图片+3 绘图块的文档，以及 500 元素+10 图片的画布。4 核/8 GB 桌面 Chrome，网络 20 Mbps/50ms；数据就绪后可交互不超过 3 秒，普通保存确认 P95≤2秒，至少采样 30 次；首次图片传输另列。通过组件挂载统计确认正文不同时初始化多套 Excalidraw；模拟资源不可用时仍可读到明确错误，不白屏覆盖原数据。
- [ ] **Step 5 — 迁移与回退说明。** 记录旧库无 Prisma migration history 的处理：先只读 diff 真实数据库与 `8cde088` 基线，差异未解释前不标记 baseline；核实后才允许 `migrate resolve --applied 00000000000000_baseline`，再 `migrate deploy` 应用新增迁移。发布前备份数据库、MinIO 和部署配置并试恢复；锁文件 npm ci、Node 20 构建、产物校验、进程/公网检查沿用既有方式。回退代码不删除新增表或对象，新数据仍保留。文档列出准备好的包、迁移 SQL 与验证结果，等待单独发布指令。
- [ ] **Step 6 — 完整 GREEN。** 依次运行 server unit、server integration、client unit、client e2e、两侧 build 和 performance；预期全部通过。再用 Node 20.19.5 运行至少一次相同构建/测试；只在新失败或新改动后重跑关联检查，不无理由重复全套。记录手工输入法/拖动结果与浏览器图像证据。
- [ ] **Step 7 — Commit。** `git add client/playwright.config.ts client/e2e/content server/test/run-e2e.ts server/scripts/content-schema-preflight.ts docs/operations/document-drawing-release.md client/vite.config.ts client/package.json client/package-lock.json server/package.json server/package-lock.json README.md && git commit -m "test: verify document and drawing workflows and release safety"`。

---

## 2. 顺序与交付门槛

| 分组 | 任务 | 验证的可独立结果 |
| --- | --- | --- |
| A：数据与权限基础 | 1–6 | API 可验证地保存、恢复、鉴权和维护引用；测试不连接生产 |
| B：可靠编辑 | 7–9 | 草稿/冲突状态机及两类编辑器可独立测试，图片和源图可携带 |
| C：完整使用流程 | 10–11 | 两中心、文档嵌图、历史与回收站、离线导出串通 |
| D：交付验证 | 12 | 真实浏览器、性能、迁移/回退证据齐备，才进入发布评审 |

任务按 1→12 顺序执行。6 依赖 1–5，8/9 依赖 7，10 依赖 8/9，11 依赖 9/10；这些共享接口应在首个任务前一起核对。文档和绘图在本阶段共享权限、保存协议与历史快照，采用一个集成计划，不分别上线缺少关联完整性的半套模块。

每个任务完成后保存测试命令、结果及提交；只有全套通过才声称第一阶段完成。整个计划执行前使用测试驱动与执行流程技能；未得到用户明确选择前不分派子代理，也不启动实现。

## 3. 规格覆盖与计划自检

| 规格范围 | 负责的任务 |
| --- | --- |
| §1–2 目标、项目归属、范围边界 | 1、2、6、10、12 |
| §3 独立导航、文档列表、文内目录及阅读 | 5、8、10 |
| §4 基础块、模板、文档引用与搜索 | 4、6、8、10 |
| §5 原生场景、图片、导入导出及预览 | 2、3、9、11 |
| §6 最新/固定嵌图、引用位置与副本 | 4、5、9、10 |
| §7 自动保存、队列、草稿、退出与冲突 | 3、4、6、7 |
| §8 历史、不可变图快照与恢复 | 3、4、10 |
| §9 回收站、引用完整性、项目删除保护 | 2、5、10 |
| §10 Markdown、离线 ZIP、容量 | 6、8、9、11 |
| §11 权限、历史资产和查看者固定图 | 2、4、6、9、11 |
| §12 数据结构、限定依赖、迁移与配置 | 1、3、4、6、9、12 |
| §13–14 全流程、17 场景、性能门槛 | 12，加各任务的最小回归测试 |

| 验收编号 | 主责任 |
| --- | --- |
| AC-01、AC-02 | 8、9、10、12 |
| AC-03、AC-04 | 2、4、9、10、12 |
| AC-05、AC-06 | 3、4、7、12 |
| AC-07、AC-08 | 2、7、12 |
| AC-09、AC-10 | 3、4、10、12 |
| AC-11、AC-12 | 2、4、6、11、12 |
| AC-13、AC-14 | 5、7、10、12 |
| AC-15、AC-16 | 4、6、9、11、12 |
| AC-17 | 1、5、12 |

计划评审时重点核对：保存队列与服务器回执的一致性；viewer 的固定图读取例外不会变成历史访问后门；首次迁移如何安全接管旧数据库；两套编辑器在 Node 20/React 19 下的实际安装构建；预览失败时保留源内容且不输出不完整导出。

## 4. 执行方式待选择

建议**当前会话顺序实现，再做一次整体独立评审**：12 个任务共享保存与引用契约，连续上下文有助于控制接口偏差，成本也较低。另一种方式是按任务分派实现者并逐项独立评审，更细但需要更多上下文与审查成本。

两种方式都先使用隔离工作目录、保留执行记录和每任务验证；用户确认计划及执行方式之后才开始产品实现。本次文档提交不安装产品依赖、不迁移数据库、不更新线上服务。
