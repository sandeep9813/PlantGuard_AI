import json
from pathlib import Path

from pydantic import BaseModel, Field

from ai.class_names import CLASS_NAMES
from utils.helpers import GeneralPlantAnswerProvider, supported_crops_text, tokenize_query


class ChatRequest(BaseModel):
    message: str
    history: list = Field(default_factory=list)


class ChatbotService:
    CROP_KEYWORDS = [
        "apple",
        "blueberry",
        "cherry",
        "corn",
        "maize",
        "grape",
        "orange",
        "peach",
        "pepper",
        "potato",
        "raspberry",
        "soybean",
        "squash",
        "strawberry",
        "tomato",
    ]

    def __init__(self, knowledge_base_path: Path):
        self.knowledge_base_path = knowledge_base_path
        self.knowledge_base: dict = {}
        self.general_answers = GeneralPlantAnswerProvider()

    def load_knowledge_base(self):
        if not self.knowledge_base_path.exists():
            print(f"Warning: Knowledge base file not found at {self.knowledge_base_path}.")
            return

        print(f"Loading knowledge base from {self.knowledge_base_path}...")
        with open(self.knowledge_base_path, "r", encoding="utf-8") as file:
            self.knowledge_base = json.load(file)
        print(f"Loaded {len(self.knowledge_base)} items from knowledge base.")

    def is_knowledge_base_loaded(self):
        return len(self.knowledge_base) > 0

    def answer(self, request: ChatRequest):
        message_clean = request.message.lower().strip()
        query_words = tokenize_query(message_clean)
        matched_class, best_score = self._best_class_match(message_clean, query_words)

        if matched_class and best_score >= 1.0 and matched_class in self.knowledge_base:
            return self._disease_response(matched_class)

        general_response = self.general_answers.answer(message_clean, query_words)
        if general_response:
            return {"response": general_response, "matched_class": None}

        crop_response = self._crop_suggestion_response(message_clean)
        if crop_response:
            return crop_response

        return self._fallback_response()

    def list_guides(self):
        guides = []
        for key, value in self.knowledge_base.items():
            crop, disease = key.split(" - ", 1)
            guides.append({
                "crop": crop,
                "disease": disease,
                "symptoms": value.get("symptoms", []),
                "immediateAction": value.get("immediate_action", ""),
                "treatment": value.get("treatment", ""),
                "prevention": value.get("prevention", ""),
                "youtubeLink": value.get("youtube_link", ""),
            })
        return guides

    def _best_class_match(self, message_clean, query_words):
        matched_class = None
        best_score = -1.0

        for class_name in CLASS_NAMES:
            score = self._class_match_score(class_name, message_clean, query_words)
            if score > best_score:
                best_score = score
                matched_class = class_name

        return matched_class, best_score

    def _class_match_score(self, class_name, message_clean, query_words):
        parts = class_name.split(" - ")
        if len(parts) != 2:
            return -1.0

        crop_part, disease_part = parts[0].lower(), parts[1].lower()
        crop_clean = crop_part.replace("(maize)", "").replace("bell", "").strip()
        disease_clean = disease_part.strip()

        crop_words = set(crop_clean.split())
        disease_words = set(disease_clean.split())
        matched_disease_words = sum(1 for word in disease_words if word in query_words)
        disease_ratio = matched_disease_words / len(disease_words) if disease_words else 0.0
        crop_matched = any(word in query_words for word in crop_words)

        score = disease_ratio
        if crop_matched:
            score += 0.5
        if disease_clean in message_clean:
            score += 1.0
        if "healthy" in disease_words and "healthy" not in query_words:
            score -= 2.0
        if "healthy" not in disease_words and "healthy" in query_words:
            score -= 1.0

        return score

    def _disease_response(self, matched_class):
        info = self.knowledge_base[matched_class]
        symptoms = "\n".join([f"- {symptom}" for symptom in info.get("symptoms", [])])
        response_text = (
            f"**{info.get('name', matched_class)}**\n\n"
            f"**Symptoms**\n"
            f"{symptoms}\n\n"
            f"**Causes**\n"
            f"{info.get('causes', 'No details available.')}\n\n"
            f"**Treatment**\n"
            f"{info.get('treatment', 'No details available.')}\n\n"
            f"**Prevention**\n"
            f"{info.get('prevention', 'No details available.')}\n\n"
            f"**Immediate Action**\n"
            f"{info.get('immediate_action', 'No details available.')}\n\n"
            f"Watch Treatment Guide: {info.get('youtube_link', 'https://www.youtube.com')}"
        )
        return {"response": response_text, "matched_class": matched_class}

    def _crop_suggestion_response(self, message_clean):
        found_crops = [crop for crop in self.CROP_KEYWORDS if crop in message_clean]
        if not found_crops:
            return None

        suggestions = []
        for crop in found_crops:
            for class_name in CLASS_NAMES:
                if crop in class_name.lower():
                    suggestions.append(f"- {class_name}")

        if not suggestions:
            return None

        suggestions_text = "\n".join(suggestions)
        response_text = (
            f"It looks like you are asking about **{', '.join([crop.capitalize() for crop in found_crops])}**.\n"
            f"I found the following conditions for this crop in my knowledge base:\n\n"
            f"{suggestions_text}\n\n"
            f"Please specify which condition you would like help with (for example: *\"Tell me about {suggestions[0].replace('- ', '')}\"*)."
        )
        return {"response": response_text, "matched_class": None}

    def _fallback_response(self):
        response_text = (
            "Hello! I am **PlantGuard AI**, your virtual agronomist. I help diagnose "
            "and treat plant diseases using our local database. How can I help you today?\n\n"
            "**Supported Crops**\n"
            f"I support: {supported_crops_text()}.\n\n"
            "Try asking a general question like *\"What is plant disease?\"* or a specific condition like *\"How do I treat Early Blight in Potatoes?\"*"
        )
        return {"response": response_text, "matched_class": None}
