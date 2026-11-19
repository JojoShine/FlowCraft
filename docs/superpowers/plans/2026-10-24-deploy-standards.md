# FlowCraft 部署规范接入计划

目标：按用户给定 deploy-standards 落地后端 Docker、前端静态部署；用户随后明确授权本次推送 GitHub、发布版本并更新线上；先完成隔离验证，再备份及迁移上线。

依据：[部署规范固定版本](https://github.com/JojoShine/deploy-standards/blob/e797017c869dadf9cc994f4aea9e4d97eea38e01/DEPLOYMENT.md)。用户明确前端保持常规部署，作为规范中单业务镜像原则的前端适配：只发布一个后端镜像，前端作为同提交的独立 Release 静态归档。

执行方式：当前会话顺序实施，最后独立评审。沿用已确定规范，不增加自动 SSH 部署。

全局约束：保留 MinIO；不读取或提交真实部署秘密；不覆盖旧环境；生产 Compose 只引用同一个 digest；迁移/初始化不随构建或启动运行；只操作隔离测试数据；旧库基线不能自动标记；前端固定 /flowcraft/、API /flowcraft/api/v1。

关注：已有库无迁移历史时停止；已有账号不能改密码；DB 断连健康失败；Nginx 前缀及静态缓存一致；发布必须提升 CI 同一镜像而非重建。

- [ ] 运行入口：Dockerfile runtime 非 root，锁文件构建；/app/bin/healthcheck、migrate、bootstrap；健康接口校验数据库；测试先复现缺失接口与初始化约束，再实现。
- [ ] 生产配置：compose.prod.yaml、环境示例及独立 Nginx 片段；前端静态归档；修正旧打包脚本，避免带入秘密或删除本地验收证据；本地 Compose 配置和 Nginx 语法验证。
- [ ] CI/Release：PR/main 相同检查、同镜像隔离验收；main 发布不可覆盖 sha 标签；版本发布校验 main/成功 CI，提升 digest 并附匹配静态包、配置及校验和；Action 固定完整 SHA。
- [ ] 验收：Docker 实际构建；隔离库重复迁移、重复初始化、启动、DB 故障与恢复；应用用户非 root；前后端构建和必要回归；独立评审与记录本地验证边界。不声称未执行的远程 Actions/GHCR/线上已通过。

用户纠正执行顺序：停止重复本地镜像演练，提交 GitHub 后由 CI 执行检查、构建、镜像验收和 GHCR 发布；生产服务器只拉取已验收摘要。
