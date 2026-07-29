# PayPal Live 1 USD 验收配置

本版本已把 `professional_monthly` 的真实支付验收价统一设为 **1.00 USD**。价格由后端控制，并同时用于页面显示、PayPal 下单、数据库订单和回调金额校验。

在 Railway 后端服务的 Variables 中配置：

```env
PAYMENT_TEST_MODE=false
PAYPAL_MODE=live
PAYPAL_LIVE_REQUIRED=true
PAYPAL_TEST_PRICE_CENTS=100
PAYPAL_CLIENT_ID=<PayPal Live Client ID>
PAYPAL_CLIENT_SECRET=<PayPal Live Secret>
PAYPAL_WEBHOOK_ID=<创建 Webhook 后得到的 Webhook ID>
PUBLIC_BASE_URL=https://你的后端域名
PAYMENT_SUCCESS_URL=https://你的前端域名/?payment=paypal-return
PAYMENT_CANCEL_URL=https://你的前端域名/?payment=cancelled
```

PayPal Developer 中 Webhook URL：

```text
https://你的后端域名/api/payments/paypal/webhook
```

至少订阅事件：

```text
PAYMENT.CAPTURE.COMPLETED
```

验收成功后，将 `PAYPAL_TEST_PRICE_CENTS` 改为 `0` 或删除，再重新部署，即恢复代码中的正式 Professional 月付价格。

不要把 `PAYPAL_CLIENT_SECRET` 写进前端、截图或提交到公开仓库。
