# Document Automation AI Enterprise V28.0.0 验收报告

## 本版本专项验收

- 前端生产构建：PASS
- 后端导入与启动：PASS
- `/api/health`：PASS
- V28 自动验收中心：10/10 PASS
- Demo 支付创建订单：PASS
- Demo 付款确认：PASS
- 重复付款通知幂等：PASS（第二次确认不重复增加点数）
- 钱包到账：PASS（Professional 8,000 点）
- License 自动发放：PASS（只生成 1 个）
- V26.1/V26.2 回归测试：4/4 PASS

## 全量历史测试结果

- 通过：35
- 跳过：4
- 失败：6

失败说明：

1. 3 项依赖 ZIP 中未包含的历史 `samples` 验收素材，属于测试数据缺失。
2. 3 项属于 V21.2/V21.3 旧版重建预期，与 V25/V26 后续双语重建逻辑不一致；本次 V28 未修改文档重建引擎。

这些失败不影响本次新增的动态处理、支付幂等、钱包、License 和企业验收中心专项功能，但在未来清理历史测试基线时应统一修订。

## 真实收款说明

Paddle、PayPal 或 Stripe 的真实收款仍需平台账户审核通过并配置生产密钥、Webhook 密钥和价格 ID。未配置时只能进行本地 Demo 验收，不能真实扣款。
