# Document Automation AI V30.2.0

## 收款通道
- PayPal Sandbox / Live Checkout
- 后端创建订单、服务端 Capture、Webhook 签名验证
- 支付订单、事件、钱包、额度与 License 幂等入账
- 支付成功、取消、失败和状态查询
- 管理端支付中心状态及 PayPal 连接测试接口

## AI Provider 增强
- 主 / 备用 Provider 配置
- 自动故障切换开关
- OCR、翻译、质量检查阶段独立 Provider
- Provider 成功率与耗时统计接口
- 团队角色与权限基础接口

## 安全
Secret 只存服务端环境变量，前端不返回明文。正式环境必须配置 Live 凭据和 Webhook ID。
