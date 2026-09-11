import shutil
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException
from app.config import settings

class StorageService:
    def __init__(self, base_dir: Path = settings.STORAGE_DIR):
        self.base_dir = base_dir

    def get_project_dir(self, project_id: str) -> Path:
        proj_dir = self.base_dir / project_id
        proj_dir.mkdir(parents=True, exist_ok=True)
        return proj_dir

    async def save_uploaded_file(self, project_id: str, file: UploadFile, subfolder: str = "drawings") -> tuple[Path, str]:
        # Validate extension
        filename = file.filename or "uploaded_file"
        suffix = Path(filename).suffix.lower()
        if suffix not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File extension '{suffix}' not permitted. Allowed: {settings.ALLOWED_EXTENSIONS}"
            )
        
        target_dir = self.get_project_dir(project_id) / subfolder
        target_dir.mkdir(parents=True, exist_ok=True)
        
        file_id = str(uuid.uuid4())[:8]
        safe_name = f"{file_id}_{Path(filename).name}"
        destination = target_dir / safe_name
        
        # Read with size check
        size = 0
        with open(destination, "wb") as buffer:
            while chunk := await file.read(1024 * 1024): # 1MB chunks
                size += len(chunk)
                if size > settings.MAX_UPLOAD_SIZE_BYTES:
                    destination.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB."
                    )
                buffer.write(chunk)
                
        return destination, filename

storage_service = StorageService()
