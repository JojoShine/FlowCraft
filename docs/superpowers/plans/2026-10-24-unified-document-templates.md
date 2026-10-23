# Unified Document Templates Implementation Plan

> **For agentic workers:** Use executing-plans inline; final independent review.

**Goal:** 文档、模板和 AI 扩写共用文档中心与正式编辑器。
**Architecture:** 既有 Template 表保存原始模板或 fileType=flowcraft 的版本化正文；客户端统一目录。新 AI 预览端点只读，确认通过现有 CAS 保存队列应用。Layout 范围内的助手上下文绑定当前文档。
**Tech Stack:** React 19、Tiptap 3、既有 Select/FileUpload/Button、Express、Prisma、现有 AI 客户端。
**Spec:** docs/superpowers/specs/2026-10-24-unified-document-templates-design.md

## Global Constraints
- 仅本地；保留原有模板和产物；不改数据库结构；不读取生产配置。
- 一个文档一个页面；沿用主题、字号、间距、右侧助手和现有保存历史。

## Review Focus
- 生成期间继续编辑或另一窗口保存，旧预览不得覆盖新正文。
- 模板中的图片、绘图及关联文档不能变成跨项目资源引用。
- 原 HTML/Word/Markdown 模板读取失败应明确提示，不空白覆盖。
- 导航/账号切换时旧请求不得应用到新目标。
- 模型错误、取消与附件错误不写文档或产物。

### Task 1: 只读扩写预览
**Files:** server/src/services/documentExpansionService.ts、server/src/routes/ai.ts、server/test/content/documentExpansion.integration.test.ts。
**Interface:** POST /ai/document-expansion 接收 documentId/baseVersion/text/instructions/files；返回 documentId/baseVersion/title/markdown。
- [x] 写并运行失败集成测试：预览不写入，拒绝越权/旧版本，附件解析和模型错误。
- [x] 实现 schema、所有权与版本校验、材料限额、结构化模型响应校验，复用现有模型和附件解析。
- [x] 运行集成测试并构建后端。

### Task 2: 模板目录合并
**Files:** 新增 documentTemplateCatalog.ts、TemplateCenter.tsx、TemplateEditor.tsx、documentTemplates.css；修改 Documents、ContentCenter、Templates、Sidebar、App。
**Interfaces:** decodeTemplate(template): Promise<DocumentBody>；encodeTemplate(body,instructions): string；cloneTemplateBody(body): DocumentBody；统一目录使用 builtin:前缀区分预制与个人 ID。
- [x] 写并运行失败测试：独立 ID、资源占位、旧格式转换、统一页签与新建选择。
- [x] 实现模板目录、Tiptap 模板编辑/另存、旧格式编辑兼容、旧路由重定向；新建可选助手扩写。
- [x] 运行前端单元测试及构建。

### Task 3: 右侧助手确认应用
**Files:** DocumentAssistantContext.tsx、DocumentExpansionPanel.tsx；修改 Layout、AIPanel、DocumentPage 和 API 客户端。
**Interfaces:** active target.prepare() 返回保存后快照；target.apply(snapshot,body) 比较本地指纹及服务端版本后走 session.update/drain。
- [x] 写并运行失败测试：生成不改正文、取消、应用确认、快照变化拒绝、目标/账号切换和附件。
- [x] 实现助手扩写模式、只读预览、明确替换确认及错误；More 菜单增加 AI 扩写/存为模板，避免堆叠顶栏按钮。
- [x] 浏览器验证旧路由、预制与旧模板、扩写预览/确认/刷新/历史恢复、继续编辑和深浅色。

### Task 4: 最终验证与复审
- [x] 前后端单元、集成、构建及完整浏览器回归通过。
- [x] 独立评审全部本次改动，修复有证据问题并保留回归。
- [x] 记录证据与本地提交，不推送部署。

## Ledger
- BASE 840ea29；继续使用 codex/document-drawing-centers 已有隔离工作区。
- 用户已明确要求按会话方案直接合并；沿用原先顺序执行与最终复审授权，不再增加阶段确认。

- Task 1: 新接口 4 项集成先 404 失败，后全部通过；后端全套 13 单元、38 集成及构建通过。
- Task 2/3: 新增模板兼容 5 项、快照应用 4 项、预览交互 3 项、统一入口 1 项；前端全套 118 项及构建通过。
- 新增浏览器 5 项全部通过。修正测试等待：保存模板后等待对话框关闭；恢复历史后等待历史面板关闭；主题切换等待原有 300ms 过渡完成。
- Ruling: 旧 HTML/Word 模板继续用既有原格式编辑器，新建文档时转换语义结构并提示版式差异；原记录不迁移覆盖。新模板和正文共用 Tiptap。
- Ruling: AI 结果整体替换需明确按钮确认，预览标注媒体仍保留于旧版本；生成期间任何本地正文/标题修改或服务端版本变化均阻止旧预览应用。
- 独立评审 unified_document_review 只读通过，独立运行新增前端 13 项通过；未发现可操作问题。

- 最终：完整浏览器 46 条通过。深色截图另发现新增预览标题使用旧文字 fallback；精确颜色断言先失败，新增面板 scoped tokens 后 5 条完整流程及最终构建通过，CSS 独立复审通过。
