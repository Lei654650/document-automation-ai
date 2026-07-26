# V32.3.6 注册与免费额度防滥用

本轮仅处理注册方式与重复领取免费额度问题。

## 已完成
- 保留邮箱注册与登录。
- 增加 Google 登录后端接口及前端 Google Identity Services 按钮。
- Google 邮箱与已有邮箱账号自动合并，不重复创建用户。
- 新增设备指纹、注册 IP、注册来源与风险评分记录。
- 新增免费额度永久领取记录，账号删除后仍可通过身份记录阻止重复领取。
- 同一设备再次注册不会重复发放免费额度。
- 同一 IP 在 24 小时达到注册上限后，新账号可注册但不赠送免费额度。
- 风险账号采用“允许注册但不赠送体验额度”，降低误封。

## 配置
在 backend/.env 中配置：

GOOGLE_CLIENT_ID=你的 Google OAuth Web Client ID
FREE_SIGNUP_CREDITS=500
REGISTRATION_IP_WINDOW_SECONDS=86400
REGISTRATION_IP_MAX_ACCOUNTS=3

未配置 GOOGLE_CLIENT_ID 时，Google 登录按钮不会显示，邮箱注册仍正常使用。

## 验证
- Python 语法检查通过。
- 后端注册、登录、同设备重复注册不发额度测试通过。
- 前端生产构建在 Linux 检查环境因原工程携带的 Windows node_modules 缺少 Rolldown Linux 原生绑定而无法执行；未改动启动脚本和运行方式。
