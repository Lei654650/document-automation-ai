# Document Automation AI V46.0.0 支付配置说明

V46.0.0 已移除正式 PayPal 与 Paddle 支付流程，统一使用 Stripe Checkout。当前提供三种前端付款入口：

- 银行卡：Stripe Checkout 订阅或一次性付款。
- 支付宝：Stripe Checkout 单期预付，不自动续费。
- 微信支付：Stripe Checkout 单期预付，不自动续费。

> 重要：支付宝和微信支付是否能在真实 Checkout 页面显示，取决于 Stripe 商户账户注册地区、结算币种、账户审核状态和 Dashboard 中的支付方式设置。代码开关打开并不代表 Stripe 一定批准该支付方式。

## 1. Railway / Render / Docker 环境变量

在后端服务中配置：

```env
APP_VERSION=46.0.0
APP_ENV=production
CLOUD_MODE=true
PUBLIC_BASE_URL=https://docai365.com
CORS_ORIGINS=https://docai365.com,https://www.docai365.com

PAYMENT_TEST_MODE=false
STRIPE_SECRET_KEY=sk_live_请填写真实密钥
STRIPE_WEBHOOK_SECRET=whsec_请填写Webhook签名密钥
STRIPE_CARD_ENABLED=true
STRIPE_ALIPAY_ENABLED=true
STRIPE_WECHAT_PAY_ENABLED=true
PAYMENT_SUCCESS_URL=https://docai365.com/?payment=success&payment_number={PAYMENT_NUMBER}&session_id={CHECKOUT_SESSION_ID}
PAYMENT_CANCEL_URL=https://docai365.com/?payment=cancelled
```

不要把真实 `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET` 写入工程文件、截图、Git 仓库或聊天记录。

## 2. Stripe Dashboard 设置

1. 登录 Stripe Dashboard。
2. 切换到正式模式。
3. 打开支付方式设置。
4. 启用银行卡。
5. 申请并启用支付宝。
6. 申请并启用微信支付。
7. 检查当前账户国家/地区与产品使用币种是否符合 Stripe 要求。

本工程套餐当前以 USD 定价。若 Stripe 账户不允许某一支付方式使用 USD，该方式可能不会显示或 Checkout 创建失败。此时应以 Stripe Dashboard 的账户可用性提示为准，不要通过修改前端强制绕过。

## 3. Webhook

正式 Webhook 地址：

```text
https://api.docai365.com/api/payments/stripe/webhook
```

至少订阅以下事件：

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
invoice.paid
invoice.payment_failed
customer.subscription.deleted
```

创建 Endpoint 后，把 Stripe 生成的 `whsec_...` Signing secret 填入后端环境变量：

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

后端使用原始请求体和 `Stripe-Signature` 验证事件签名。未配置签名密钥时，正式支付状态不会可靠写入账户余额和套餐。

## 4. 三种付款方式的计费规则

### 银行卡

- 月付/年付套餐：Stripe Subscription 自动续费。
- 积分包：一次性付款。

### 支付宝和微信支付

- 月付套餐：支付当前一个月，期满后客户重新购买。
- 年付套餐：支付当前一年，期满后客户重新购买。
- 积分包：一次性付款。
- 前端会明确显示“单期预付，不自动续费”。

这是为了避免把不支持 Checkout 订阅模式的本地支付方式伪装成自动续费，导致订单、套餐期限和客户预期不一致。

## 5. 上线检查

1. 后端 `/api/health` 显示 `46.0.0`。
2. 前端页面显示 `V46.0.0`。
3. 新客户注册后能收到邮箱验证码。
4. 未验证客户再次登录时自动进入验证页，而不是显示“联系管理员”。
5. `/api/payments/config` 中仅显示 Stripe 支付处理器。
6. 使用 Stripe 测试模式分别创建银行卡、支付宝和微信支付订单。
7. 用 Stripe CLI 或 Dashboard 发送测试 Webhook，确认订单只入账一次。
8. 正式模式下完成小额真实付款、套餐开通、积分到账、退款和失败订单测试后再公开上线。

## 6. 故障排查

### 支付宝或微信支付没有出现

依次检查：

- Stripe Dashboard 是否已启用该支付方式；
- 商户账户地区是否支持；
- 当前 USD 币种是否支持；
- 环境变量开关是否为 `true`；
- 后端是否已重新部署；
- Stripe 返回的 Checkout 错误信息。

### 付款成功但账户未到账

重点检查：

- Webhook URL 是否正确；
- `STRIPE_WEBHOOK_SECRET` 是否来自当前 Endpoint；
- Webhook 是否收到 `checkout.session.completed` 或异步成功事件；
- Railway/Render 日志是否出现签名验证失败；
- 付款订单中的邮箱是否与当前登录账户一致。

### 客户登录显示邮箱未验证

让客户直接在登录页点击重新发送验证码并完成验证。只有管理员明确停用或暂停账户时，系统才显示联系管理员的提示。
