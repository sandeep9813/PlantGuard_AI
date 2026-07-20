from fastapi import HTTPException, UploadFile


class ImageValidator:
    def validate_upload(self, file: UploadFile):
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="The uploaded file must be an image.")

