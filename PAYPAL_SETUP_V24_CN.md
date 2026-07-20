# V24 PayPal 国际收款配置（越南个人）

1. 在 PayPal 越南官网注册或升级为 Business 商家账户。
2. 完成邮箱、手机号、身份资料和越南银行账户验证。
3. 进入 PayPal Developer Dashboard，创建 App。
4. 先选择 Sandbox，复制 Client ID 和 Secret。
5. 在部署平台环境变量中填写：
   - PAYPAL_MODE=sandbox
   - PAYPAL_CLIENT_ID=你的 Client ID
   - PAYPAL_CLIENT_SECRET=你的 Secret
   - PUBLIC_BASE_URL=https://你的正式域名
6. 在 Developer Dashboard 创建 Webhook，地址：
   https://你的正式域名/api/payments/paypal/webhook
7. 至少勾选 PAYMENT.CAPTURE.COMPLETED，并把 Webhook ID 填入 PAYPAL_WEBHOOK_ID。
8. 使用 Sandbox 买家账号完成测试付款。确认订单变成 paid、钱包自动增加 DA Credits。
9. 测试通过后，将 App 切换到 Live，填写 Live Client ID、Secret、Webhook ID，并设置 PAYPAL_MODE=live。

注意：V24 的 PayPal 付款采用一次性 Checkout。套餐购买会立即开通对应期限和额度，但不会自动续费；自动订阅可在后续版本接入 PayPal Subscriptions。
