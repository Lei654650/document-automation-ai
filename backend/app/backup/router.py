from __future__ import annotations

from pathlib import Path
from typing import Callable

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .service import BackupService


class CreateBackupRequest(BaseModel):
    note: str = Field(default="", max_length=500)


class BackupPolicyRequest(BaseModel):
    enabled: bool = True
    frequency: str = "daily"
    retention: int = Field(default=14, ge=1, le=90)


class RestoreBackupRequest(BaseModel):
    confirmation: str


def create_backup_router(*, base_dir: Path, persistent_root: Path, db_path: Path, require_platform_admin: Callable):
    router = APIRouter(prefix="/api/admin/backups", tags=["platform-backups"])
    service = BackupService(base_dir=base_dir, persistent_root=persistent_root, db_path=db_path)

    @router.get("/access")
    def access(user: dict = Depends(require_platform_admin)) -> dict:
        return {"allowed": True, "email": user.get("email", "")}

    @router.get("")
    def list_backups(user: dict = Depends(require_platform_admin)) -> dict:
        backups = service.list_backups()
        return {"backups": backups, "count": len(backups), "policy": service.get_policy()}

    @router.post("")
    def create_backup(payload: CreateBackupRequest, user: dict = Depends(require_platform_admin)) -> dict:
        try:
            return service.create_backup(backup_type="manual", note=payload.note, created_by=user.get("email", "platform-admin"))
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=500, detail=f"Unable to create backup: {exc}") from exc

    @router.get("/policy")
    def get_policy(user: dict = Depends(require_platform_admin)) -> dict:
        return service.get_policy()

    @router.put("/policy")
    def update_policy(payload: BackupPolicyRequest, user: dict = Depends(require_platform_admin)) -> dict:
        try:
            return service.save_policy(payload.model_dump())
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @router.get("/{backup_id}/download")
    def download_backup(backup_id: str, user: dict = Depends(require_platform_admin)):
        try:
            info = service.get_backup(backup_id)
            path = service.backup_dir / info["filename"]
            return FileResponse(path, media_type="application/zip", filename=info["filename"])
        except (FileNotFoundError, ValueError):
            raise HTTPException(status_code=404, detail="Backup not found")

    @router.delete("/{backup_id}")
    def delete_backup(backup_id: str, user: dict = Depends(require_platform_admin)) -> dict:
        try:
            service.delete_backup(backup_id)
            return {"deleted": True, "backup_id": backup_id}
        except (FileNotFoundError, ValueError):
            raise HTTPException(status_code=404, detail="Backup not found")

    @router.post("/{backup_id}/restore")
    def restore_backup(backup_id: str, payload: RestoreBackupRequest, user: dict = Depends(require_platform_admin)) -> dict:
        if payload.confirmation != "RESTORE":
            raise HTTPException(status_code=400, detail="Type RESTORE to confirm this operation")
        try:
            return service.restore_backup(backup_id, restored_by=user.get("email", "platform-admin"))
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Backup not found")
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=400, detail=f"Unable to restore backup: {exc}") from exc

    router.backup_service = service
    return router
