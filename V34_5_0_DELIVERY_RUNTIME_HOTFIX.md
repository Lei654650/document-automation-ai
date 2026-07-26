# V34.5.0 Delivery Runtime Hotfix

- 修复 Excel 交付阶段误调用不存在的 `temp__unlink_with_retry` 导致全部文件被隔离的问题。
- 统一使用已定义的 `_unlink_with_retry` 清理 `.writing.tmp` 临时文件。
- 新增运行时与静态回归测试，防止未定义的文件清理 helper 再次进入稳定版本。
- 不修改界面、翻译、质量评分或性能策略。
