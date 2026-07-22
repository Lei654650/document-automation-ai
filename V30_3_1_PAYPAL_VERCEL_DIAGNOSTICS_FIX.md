# V30.3.1 PayPal Vercel Diagnostics Fix

- 增加 PayPal Sandbox 凭证格式预检，识别复制了“Client ID/Secret”标签或凭证不完整的情况。
- 使用 certifi CA 证书和明确 User-Agent，提升 Vercel Python 运行时访问 PayPal API 的兼容性。
- PayPal 401、网络错误和订单创建异常会写入 Vercel Runtime Logs，并向前端返回可读原因。
- 新增 `/api/payments/paypal/diagnostics` 登录用户安全诊断接口，不暴露凭证或令牌。
- 前端 checkout 支持读取非 JSON 错误响应，不再出现按钮无反馈。
- 指定 Python 3.12，消除 Vercel 未指定 Python 版本警告。
