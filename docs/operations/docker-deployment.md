# FlowCraft 发布与部署

按 [deploy-standards e797017](https://github.com/JojoShine/deploy-standards/blob/e797017c869dadf9cc994f4aea9e4d97eea38e01/DEPLOYMENT.md) 实现。用户指定后端 Docker、前端常规静态部署。现有默认分支为 **master**，承担规范中 main 的主分支角色，不擅自改名。

## 交付内容

- 一个后端镜像 `ghcr.io/jojoshine/flowcraft`，包含编译应用、Prisma 迁移、独立首次账号初始化。构建与启动均不执行迁移/初始化。不打包演示 seed。
- 前端 `/flowcraft/` 构建为 `flowcraft-client.tar.gz`，API 为 `/flowcraft/api/v1`，由现有 Nginx 提供静态文件，不另建前端容器。
- PR 和 master：锁文件安装、两端测试与构建、隔离集成/浏览器测试、实际镜像验收。镜像验收创建独立临时 PostgreSQL/MinIO，检查重复迁移、重复初始化、运行角色无 DDL 权限、已有业务数据保留、非 root、登录、数据库故障及恢复；结束只清理自身测试容器。
- 只有 master 成功验收的同一个本地镜像才推送不可覆盖的 `sha-完整SHA` 标签。正式 `vX.Y.Z` 标签要求提交属于 master 且对应 CI 成功，从该 CI 下载部署文件和前端，通过原 digest 提升版本标签，禁止重建。提升后再校验 digest 完全一致。
- Release 附带生产 Compose、环境示例、独立 Nginx 片段、本文、前端静态包、release.json 与 SHA256SUMS。候选归档保留 90 天；过期可重跑相应主分支 CI；已有 SHA 标签将拉取原 digest、核对提交标签并重新进行镜像隔离验收后复用，绝不覆盖镜像。版本提升重试只接受已存在且摘要完全相同的版本标签。不可混用其他版本文件。
- 只使用完整 digest 部署。现有仓库未声明开源许可证，镜像 OCI 标注 `LicenseRef-Proprietary`。不把工作流规范的 MIT 许可证误作本项目许可证。

## 生产配置

业务目录 `/opt/flowcraft`，项目名 `flowcraft-production`。新后端宿主端口建议 **31008**，仅绑定 127.0.0.1，实际分配须检查服务器冲突；原 3800 不自动替换。容器监听 0.0.0.0:8080，BASE_PATH 固定 `/flowcraft`，健康 `/flowcraft/healthz` 校验数据库连接，不依赖外部 AI。

数据库和 MinIO 沿用现有外部服务，不纳入生产 Compose。容器地址不能直接照抄旧进程的 localhost，须使用可达主机名/网络；采用 host.docker.internal 时已配置 host-gateway，仍须核对数据库监听、pg_hba、Docker 子网与实际角色权限。保留现有数据库、MinIO 桶/密钥、JWT_SECRET 和 AI 配置；既有 AI 客户端启动要求 API key，因此 Compose 要求保留该值，隔离验收使用仅连接回环拒绝端口的假 key。初始化秘密不传给 app。

将匹配版本的文件放入 `/opt/flowcraft`。由 .env.prod.example 创建 .env.prod，设置真实 digest 和现有运行配置；单独的迁移角色提供所需 DDL 权限。环境文件 chmod 600，按数据读取，不 source/eval。首次需要初始化空库时才填写 .env.bootstrap（chmod 600），显式执行 bootstrap 服务。已有任意账号时初始化无操作，不新增账号或改密码；空库要求指定用户名与至少 12 字符密码。bootstrap 不创建演示项目。

私有 GHCR 镜像需只读拉取凭据，公开镜像可匿名。发布后核对实际可见性，不在文档/命令行放真实 token。

## 旧库迁移先决条件

现有生产旧库可能没有 Prisma 迁移记录。**禁止自动 resolve、db push、migrate reset**。先备份并在隔离环境试恢复，再按 [旧库只读预检与基线核对](document-drawing-release.md) 比较原结构。生产不上传业务源码或安装 npm 依赖；基线 schema、预检及标记命令使用同版本镜像中随附工具/文件。迁移失败保留旧应用，必须解释差异后再继续。

## 更新步骤

1. 核对版本提交、镜像 digest、前端归档和 SHA256SUMS；核对 CPU 架构（当前 CI 镜像 linux/amd64），镜像可拉取性和角色权限。首次切换先检查现有 Nginx 拓扑；标准片段假定宿主机 Nginx，不能直接套用到隔离网络的 Nginx 容器。
2. 备份数据库、MinIO 对象和当前部署配置，记录校验值和旧后端/前端版本；隔离恢复演练通过才继续。保留旧进程及配置作为首次容器化回退入口。
3. 下载同一 Release 的配置和前端包到新版本目录，保留上一份 Compose/.env.prod/Nginx。填写现有配置，确认固定 digest。前端解压到 `/opt/flowcraft/frontend/releases/<version>`，把新版本 assets 增量复制到 `/opt/flowcraft/frontend/assets/`（保留旧哈希资源供打开的页面及回退使用）。其他静态文件由 `frontend/current` 指向对应版本；切换使用同目录临时软链再 rename，不删除旧版本目录。
4. 如旧库未建立迁移历史，先用随镜像编译的只读预检工具比对 8cde088 基线；仅在基线原有表的字段、索引和外键完全匹配、备份与恢复已确认后显式标记旧基线。预检额外发现的旧 Document/Todo/TodoGroup/TodoNote 表必须按本次旧库兼容附录人工逐项核对并保留；仅这类已记录的纯额外旧表差异可在记录审阅结论后接受，即使 baselineCanBeMarked=false。其他差异一律停止，不得直接执行预检输出中的 DROP SQL；审阅通过才显式标记；然后迁移。两步分别执行，不能自动推断可标记。

```sh
docker compose --env-file .env.prod -f compose.prod.yaml run --rm --no-deps migrate sh -c 'CONTENT_PREFLIGHT_DATABASE_URL="$DATABASE_URL" exec /app/bin/schema-preflight --baseline /app/prisma/baseline.prisma'
# 仅在上述审阅通过且旧库确无迁移记录时执行，已有迁移记录不得重复标记：
docker compose --env-file .env.prod -f compose.prod.yaml run --rm --no-deps migrate node node_modules/prisma/build/index.js migrate resolve --applied 00000000000000_baseline
```

```sh
docker compose --env-file .env.prod -f compose.prod.yaml pull
docker compose --env-file .env.prod -f compose.prod.yaml run --rm --no-deps migrate
# 前一步成功才继续。
docker compose --env-file .env.prod -f compose.prod.yaml up -d --no-build --wait app
docker compose --env-file .env.prod -f compose.prod.yaml ps
curl --fail http://127.0.0.1:31008/flowcraft/healthz
```

5. 健康通过才切换前端软链及 FlowCraft 独立 Nginx 片段；保留域名、证书和其他业务配置。片段部署在 `/etc/nginx/business/<domain-id>/flowcraft.conf`，由已有 HTTPS server include，不能再新建冲突的 server。修改后 nginx -t 通过才 reload。
6. 验证公网健康、登录、原项目/产物保留、MinIO 旧文件可读，以及文档/绘图创建、保存、刷新、版本、图片与下载。确认新资产已进入备份；首次从 PM2 切换后才停止旧 FlowCraft 进程，不影响其他业务。

仅首次空库且需要初始化时，使用同一个镜像：

```sh
docker compose --env-file .env.prod --env-file .env.bootstrap -f compose.prod.yaml run --rm --no-deps bootstrap
```

## 回退

迁移失败停止更新，旧后端保持运行。新后端健康或业务验证失败时恢复上一版本 Compose/.env.prod 的镜像 digest、前端软链与 Nginx 片段，重新健康检查。首次容器切换可回原 PM2/3800 配置。回退应用不自动回滚数据库，不删除新增文档、版本或 MinIO 对象；数据库恢复是单独步骤，需停止写入并使用一致时间点的数据库/MinIO 备份。

Compose 配置 Docker 日志轮转 10 MB × 3。应用旧文件日志位于容器内 logs，随容器替换丢弃；日常运维以 Docker 输出收集并按需接入已有日志服务。维护备份保留、磁盘空间和证书续期。默认单实例替换，允许短暂中断。

## 本次旧库兼容

线上存在旧版 Document 表（3 条记录，含 content/shareToken/fileKey 等字段）及 Todo/TodoGroup/TodoNote 表，当前旧 API 未注册文档/待办路由。新文档中心的 ORM 模型仍叫 Document，物理表改为 ContentDocument，避免与旧表冲突；旧 Document 及待办表不删除、不改名、不改内容。此次新增内容迁移尚未在生产执行，因此在首次发布前调整新增表名。CI 以旧表保留字节的情形执行迁移验收。基线预检显示的额外旧表应审阅记录，不能把其 DROP 差异当迁移脚本执行。

MinIO 官方旧容器仓库在 GitHub CI 已无法拉取，隔离测试服务改由 CI 从 MinIO 官方固定提交 0d7408fc9969caf07de6a8c3a84f9fbb10a6739e（2025-04-22）构建，不发布该测试镜像。线上继续使用既有 MinIO，不升级或替换。
