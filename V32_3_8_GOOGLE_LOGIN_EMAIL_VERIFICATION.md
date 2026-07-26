# V32.3.8 Google 登录与邮箱验证

本版本只完善注册与账号体系：

- 邮箱注册改为先发送验证码，验证成功后才激活账号。
- 未验证账号不会创建登录会话，也不会领取免费 Credits。
- 验证成功后执行设备指纹、IP 注册频率及重复领取判断。
- 支持验证码重发和冷却时间。
- Google Identity Services 一键注册/登录。
- Google 邮箱与已有邮箱账号自动绑定到同一个用户。
- Google 未配置时自动隐藏入口，不影响邮箱注册。
- 保留已经验证通过的 QQ SMTP 找回密码功能。

## Google 配置

在 backend/.env 中填写：

GOOGLE_CLIENT_ID=你的 Google OAuth Web Client ID

Google Cloud Console 的 Authorized JavaScript origins 至少加入：

- http://127.0.0.1:5173
- http://localhost:5173
- 正式网站域名

不得把 Google Client Secret 写入前端。本版本使用 Google Identity Services ID Token，只需要 Web Client ID。
