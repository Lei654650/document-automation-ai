from __future__ import annotations

from getpass import getpass
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
LOCAL_ENV = BACKEND_DIR / ".env.local"


def ask(prompt: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{prompt}{suffix}: ").strip()
    return value or default


def main() -> int:
    print("\nDocument Automation AI - 本地 SMTP 配置\n")
    email = ask("QQ 邮箱地址")
    if not email or "@" not in email:
        print("邮箱地址无效，未写入配置。")
        return 1

    auth_code = getpass("QQ 邮箱授权码（输入时不会显示）: ").strip()
    if not auth_code:
        print("授权码不能为空，未写入配置。")
        return 1

    host = ask("SMTP 服务器", "smtp.qq.com")
    port = ask("SMTP 端口", "465")
    use_ssl = port == "465"

    content = "\n".join(
        [
            "# Local-only SMTP secrets. Do not commit this file.",
            f"SMTP_HOST={host}",
            f"SMTP_PORT={port}",
            f"SMTP_USERNAME={email}",
            f"SMTP_PASSWORD={auth_code}",
            f"SMTP_FROM_EMAIL={email}",
            "SMTP_FROM_NAME=Document Automation AI",
            f"SMTP_USE_SSL={'true' if use_ssl else 'false'}",
            f"SMTP_USE_TLS={'false' if use_ssl else 'true'}",
            "",
        ]
    )
    LOCAL_ENV.write_text(content, encoding="utf-8")
    print(f"\n配置已保存：{LOCAL_ENV}")
    print("请关闭当前后端窗口，再重新运行 Start_All.bat。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
