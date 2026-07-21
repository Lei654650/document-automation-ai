# V28.3.0 企业验收报告

## 已通过

- 前端生产构建：PASS
- 后端 Python 编译：PASS
- 后端启动与健康检查：PASS
- 用户注册：PASS
- 用户登录与会话验证：PASS
- 未登录访问钱包被拒绝：PASS
- 登录后钱包读取：PASS
- 购买流程强制绑定登录账户：PASS
- 未配置真实支付密钥时阻止假付款：PASS
- V26.1 / V26.2 回归测试：4/4 PASS
- 最终 ZIP 解压结构检查：PASS

## 真实支付上线前仍需外部配置

当前代码已支持 Paddle、PayPal、Stripe 插件，但本工程没有用户的真实商户密钥，因此不能在本地凭空产生真实扣款。正式上线需配置：

- Paddle：PADDLE_API_KEY、PADDLE_PRICE_MAP、PADDLE_WEBHOOK_SECRET、PADDLE_ENV=live
- 或 PayPal / Stripe 对应 Live 密钥
- PUBLIC_BASE_URL 与 HTTPS 正式域名
- AUTH_SECRET 随机强密钥

默认 PAYMENT_TEST_MODE=false，普通客户不会再进入 Demo 付款。
