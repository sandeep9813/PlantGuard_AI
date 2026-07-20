from pathlib import Path

from ai.class_names import CLASS_NAMES
from services.chatbot_service import ChatbotService
from services.prediction_service import PredictionService

BASE_DIR = Path(__file__).resolve().parents[1]

prediction_service = PredictionService(BASE_DIR / "trained_model" / "efficientnet_b4.keras")
chatbot_service = ChatbotService(BASE_DIR / "knowledge_base" / "disease_knowledge.json")


class AppServices:
    def __init__(self):
        self.predictions = prediction_service
        self.chatbot = chatbot_service

    def startup(self):
        self.predictions.load_model()
        self.chatbot.load_knowledge_base()

    def shutdown(self):
        print("Shutting down backend...")

    def health(self):
        return {
            "status": "online",
            "model_loaded": self.predictions.is_model_loaded(),
            "knowledge_base_loaded": self.chatbot.is_knowledge_base_loaded(),
            "supported_classes_count": len(CLASS_NAMES),
        }


app_services = AppServices()
