import asyncio
from pathlib import Path

from fastapi import HTTPException, UploadFile

from ai.model_loader import ModelLoader
from ai.predictor import PlantDiseasePredictor
from ai.preprocess import ImagePreprocessor
from utils.leaf_validator import LeafImageValidator
from utils.validator import ImageValidator, MAX_FILE_SIZE


class PredictionService:
    def __init__(self, model_path: Path):
        self.model_loader = ModelLoader(model_path)
        self.preprocessor = ImagePreprocessor()
        self.predictor = PlantDiseasePredictor()
        self.validator = ImageValidator()
        self.leaf_validator = LeafImageValidator()

    def load_model(self):
        self.model_loader.load()

    def is_model_loaded(self):
        return self.model_loader.is_loaded

    async def predict(self, file: UploadFile):
        if not self.model_loader.model:
            raise HTTPException(status_code=503, detail="Plant classification model is not loaded.")

        self.validator.validate_upload(file)
        try:
            contents = await file.read()
            if len(contents) > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail="File size must not exceed 10MB.")
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, self._sync_predict, contents)
        except HTTPException:
            raise
        except Exception as error:
            print(f"Prediction error: {str(error)}")
            raise HTTPException(status_code=500, detail=f"Failed to analyze image: {str(error)}")

    def _sync_predict(self, contents: bytes):
        image = self.preprocessor.load_image(contents)
        self.leaf_validator.validate(image)
        image = self.leaf_validator.clean_image(image)
        img_array = self.preprocessor.to_model_input(image)
        return self.predictor.predict(self.model_loader.model, image, img_array)
