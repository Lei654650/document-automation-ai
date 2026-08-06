# Document Automation AI V46.0.0 验收报告

验收日期：2026-08-06

## 验收范围

- 新客户注册、邮箱验证和登录错误引导。
- 账户停用/暂停状态提示。
- Stripe 银行卡、支付宝、微信支付订单创建。
- 支付订单归属验证、Webhook 入账幂等、钱包和积分更新。
- 正式域名 CORS。
- 前端生产构建和后端静态页面。
- Windows 快速启动依赖完整性。

## 自动化测试

最终测试命令：

```text
PYTHONPATH=backend python -m pytest -q backend/tests
```

最终结果以交付前最后一次执行记录为准，详见本报告末尾“最终验证结果”。

专项验收覆盖：

- 未验证账户返回 `EMAIL_NOT_VERIFIED`。
- 停用账户返回 `ACCOUNT_DISABLED`。
- 银行卡订阅订单使用 recurring 计费模型。
- 支付宝套餐使用 prepaid 计费模型。
- 微信支付套餐使用 prepaid 计费模型。
- Webhook 重复通知不会重复增加积分。
- 银行卡订阅续费成功时刷新当期积分，重复 invoice 事件只处理一次。
- 非订单所有者无法查询订单状态。
- 正式网站域名通过 CORS 预检。

## 真实流程模拟

已使用隔离临时数据目录启动后端并模拟：

1. 打开健康检查与前端首页；
2. 注册新客户；
3. 验证未激活账户登录提示；
4. 输入邮箱验证码完成激活；
5. 登录并读取支付配置；
6. 创建支付宝单期预付订单；
7. 在 Demo 测试模式确认订单；
8. 查询订单状态；
9. 检查钱包积分到账。

流程结果：通过。

## 安全检查

- 工程不包含真实 `.env`、Stripe Secret Key 或 Webhook Secret。
- 支付状态与 Demo 确认接口要求登录。
- Stripe Webhook 验证签名。
- 正式支付状态依赖 Webhook，不信任浏览器返回参数直接入账。
- 打包时清除测试数据库、上传文件、输出文件、日志和缓存。

## 上线前仍需由部署者完成

- 在 Stripe Dashboard 完成商户审核。
- 确认账户可启用支付宝和微信支付。
- 配置正式 `STRIPE_SECRET_KEY` 和 `STRIPE_WEBHOOK_SECRET`。
- 建立正式 Webhook Endpoint。
- 配置生产 SMTP 并进行真实邮箱验证测试。
- 各渠道完成小额真实付款、失败、取消、退款和异步到账验收。

## 最终验证结果

此区域将在交付打包前更新。

### 交付前执行记录

```text
Python source compile: PASS（89 个 Python 文件）
Backend automated tests: 157 passed, 9 skipped
Frontend production build: PASS（Vite 8.1.4，1584 modules）
Uvicorn startup and customer-flow smoke test: PASS
Official-domain CORS preflight: PASS
Frontend dist synchronized to backend/static: PASS
```

`9 skipped` 为测试套件中依赖可选外部环境或非当前平台能力的既有跳过项，不是失败项。
