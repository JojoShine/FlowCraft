# Workspace Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the requested editor spacing, consistent content icons, complete common drawing libraries, nine document templates, and AI-assisted task breakdown locally.

**Architecture:** Keep existing Tiptap blocks, content APIs, Excalidraw and AI provider. Bundle full community library packs locally, expose category loading while preserving personal libraries. AI creates a validated editable preview; an owner-confirmed atomic, idempotent batch operation writes tasks to the selected project.

**Tech Stack:** React 19, Tiptap 3, Excalidraw 0.18, existing UI components, Express, Prisma, Zod, existing chatComplete provider.

**Spec:** User's four numbered requirements in this conversation, 2026-10-23. Local-only restriction remains in effect.

## Global Constraints

- Keep original application typography, theme and right AI panel; no deployment or push.
- Add balanced document-editor inner spacing; use shared star/trash controls for documents and drawings.
- Templates: 可研报告、实施方案、项目计划、测试报告、需求方案、设计方案、会议纪要、应急方案、培训方案.
- Use complete library packs, retaining existing personal additions/removals and avoiding runtime third-party downloads.
- AI may read only the selected owner's project/document. Generation performs no writes. Import requires explicit selection and confirmation, validates every task, and is atomic and retry-safe.

## Review Focus

- Existing customized libraries must receive a clear path to expanded packs without being overwritten.
- Large cloud packs should load on demand, rather than blocking the canvas or rendering all icons at startup.
- Templates must remain independently editable Tiptap content with unique block IDs and working tables.
- Foreign-project documents and viewer mutation attempts must be denied before AI calls or writes.
- Network failures, project changes and duplicate import submissions must preserve the reviewed draft and never create partial/duplicate batches.

## Tasks

- [x] Align editor spacing and shared content actions; add nine templates and verify creation/persistence.
- [x] Bundle full common library packs, add category loading/search, verify insertion/persistence and personal-library preservation.
- [x] Add AI task-preview and atomic import APIs with validation/permissions/idempotency tests; connect an editable task mode inside the right FlowCraft assistant to text/document/attachment sources.
- [x] Run relevant frontend/backend and browser regressions, build, perform one independent final review, retain evidence and commit locally.

## User follow-up incorporated

The task breakdown entry lives inside FlowCraft assistant, not a Kanban dialog. Attachments support MD/TXT/DOCX/PDF (up to three files, 5 MB each, combined material 30000 characters, PDF up to 100 pages), parsed without persistence. Returning to chat keeps the existing conversation draft; changing the main app project preserves task material, preview and import retry identity.
