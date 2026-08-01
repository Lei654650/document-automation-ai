# PayPal Live 验收说明（归档）

当前 V45.0.0 交付阶段禁止真实扣款。请保持：

```env
PAYPAL_MODE=sandbox
PAYPAL_LIVE_ENABLED=false
PAYPAL_TEST_PRICE_CENTS=0
```

本阶段只允许使用 PayPal Sandbox 买家和商家测试账户完成 Checkout、Capture、Webhook、订单、钱包和 Credits 验收。

未来如需 Live 验收，必须先获得单独书面批准，再使用 PayPal Live 应用凭据，并同时显式设置 `PAYPAL_MODE=live` 与 `PAYPAL_LIVE_ENABLED=true`。不得将任何凭据写入代码、文档、日志、截图或版本库。
