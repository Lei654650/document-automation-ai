# V28.3.0 真实账户与支付通道版本

- 新增客户注册、登录、退出和会话认证。
- 新增“我的账户”入口，统一查看套餐、DA Credits 和 License。
- 购买套餐必须先登录，订单邮箱由已认证账户确定，不能在前端伪造。
- 钱包和 License 接口改为登录后访问。
- 默认关闭 Demo 支付；正式界面不再显示 Demo 购买文案。
- 保留 Paddle / PayPal / Stripe 插件，配置真实密钥后自动开放结账。
- 新增 AUTH_SECRET 和 SESSION_TTL_SECONDS 环境变量。

注意：真实扣款仍需完成第三方平台审核并配置 Live API Key、Price ID 和 Webhook Secret。
