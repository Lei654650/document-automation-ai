# V30.2.0 验收报告

- 前端 Vite 生产构建：PASS
- Python compileall：PASS
- /api/health 版本检查：PASS
- 支付中心配置状态接口：PASS
- 主/备用 Provider 路由读取与保存：PASS
- Provider 调用统计接口：PASS
- 团队权限读取与保存：PASS
- PayPal 服务端创建订单、Capture、Webhook、幂等入账代码检查：PASS
- 静态前端已同步至 backend/static：PASS

说明：真实 PayPal 付款必须在部署环境填写 PAYPAL_CLIENT_ID、PAYPAL_CLIENT_SECRET、PAYPAL_WEBHOOK_ID 后进行 Sandbox，再切换 Live。
