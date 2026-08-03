# V45.0.1 RAR 解压修复

## 修复范围

- Docker 云端运行环境安装 `unar`，并保留 `bsdtar` 作为备用解压器。
- 后端不再把普通 `tar` 误判为 RAR 解压器。
- RAR 只允许使用 UnRAR、unar、7-Zip、WinRAR 或 `bsdtar`。
- 一个解压器不兼容时会自动尝试下一个可用解压器。
- 区分加密、损坏、不支持算法和服务器缺少组件等错误。
- 同步修复 `backend/app/main.py` 与兼容副本 `backend/app/services/main.py`。

## 回归要求

- 普通无密码 RAR 可解压。
- 中文目录和中文文件名可保留。
- ZIP、7Z、TAR、GZ 原有处理逻辑不受影响。
