# V32.3.4 邮箱验证码真实发送修复

- 新增 SMTP SSL（465）与 STARTTLS（587）两种发送模式。
- 使用标准 MIME 邮件，支持中文主题和正文。
- 默认彻底关闭网页显示本地开发验证码。
- SMTP 未配置、授权码缺失或发送失败时返回明确错误，不启动成功倒计时。
- 只有真实邮件发送成功后，前端才显示“验证码已发送”。
- 前后端版本统一为 32.3.4。

## QQ 邮箱配置
在 `backend/.env` 中填写：

```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USERNAME=你的QQ邮箱
SMTP_PASSWORD=QQ邮箱生成的SMTP授权码（不是QQ登录密码）
SMTP_FROM_EMAIL=你的QQ邮箱
SMTP_FROM_NAME=Document Automation AI
SMTP_USE_TLS=false
SMTP_USE_SSL=true
PASSWORD_RESET_DEV_CODE_ENABLED=false
```

保存后重新启动软件即可。
