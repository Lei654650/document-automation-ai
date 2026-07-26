# V36.2.0 DeepSeek 模型兼容修复

- 官方 DeepSeek API 保持 `deepseek-chat` / `deepseek-reasoner` 兼容。
- 非官方 OpenAI 兼容网关若仍保存旧模型名，自动迁移为 `deepseek-v4-flash`。
- 当网关返回 HTTP 400 并明确给出支持模型时，自动提取支持列表并优先重试 `deepseek-v4-flash`。
- AI 服务商中心增加 `deepseek-v4-flash` 与 `deepseek-v4-pro` 选项。
- 保留 V36.1 翻译质量保护、旧译文保留和批量缓存性能优化。
