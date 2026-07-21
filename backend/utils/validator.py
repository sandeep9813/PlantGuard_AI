from fastapi import HTTPException, UploadFile

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


class ImageValidator:
    def validate_upload(self, file: UploadFile):
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="The uploaded file must be an image.")
        if file.size and file.size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File size must not exceed 10MB.")

