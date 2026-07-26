# V40.5.1 AI Batch Hotfix

- 基线：DAI_V40.5.0(2)
- 未修改启动脚本、健康检查、前端、解压和 Excel 左右分列模块。
- AI 批次改为单通道顺序执行，避免 Future 排队后无法退出。
- 每个文件默认 AI 总预算 55 秒，预算耗尽后停止新增网络请求并继续后续流程。
- 每个批次记录 ENTER / RETURN / TIMEOUT / ERROR。
- 单批最多一次请求，临时禁用隐藏重试和递归拆分。
- 修复 quality_repair 中 initial_count 未定义导致文件误判失败的问题。
