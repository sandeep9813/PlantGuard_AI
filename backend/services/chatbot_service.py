import json
from pathlib import Path

from pydantic import BaseModel, Field

from ai.class_names import CLASS_NAMES
from utils.helpers import GeneralPlantAnswerProvider, supported_crops_text, tokenize_query


class ChatResponse(BaseModel):
    response: str
    matched_class: str | None = None
    suggestions: list[str] = []


class ChatRequest(BaseModel):
    message: str
    history: list = Field(default_factory=list)
    crop: str = ""
    disease: str = ""


SYMPTOM_KEYWORDS = {
    "spots", "spot", "lesions", "lesion", "blight", "rust", "mildew",
    "yellow", "yellowing", "brown", "black", "white", "orange",
    "wilt", "wilting", "curl", "curling", "mold", "rot", "rotting",
    "holes", "streaks", "mosaic", "powder", "powdery", "fuzzy",
    "damp", "water", "soaked", "stunt", "stunted", "drop", "falling",
}


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

        ctx = self._get_conversation_context(request.history)

        has_symptom_words = bool(query_words & SYMPTOM_KEYWORDS)
        found_crops = [c for c in self.CROP_KEYWORDS if c in message_clean]

        if has_symptom_words and found_crops:
            symptom_match = self._symptom_diagnosis(message_clean, query_words)
            if symptom_match:
                return symptom_match

        matched_class, best_score = self._best_class_match(message_clean, query_words)

        if matched_class and best_score >= 1.0 and matched_class in self.knowledge_base:
            detail = self._detect_detail_request(message_clean)
            if detail:
                return self._specific_detail_response(matched_class, detail)
            result = self._disease_response(matched_class)
            result["suggestions"] = self._generate_suggestions(matched_class)
            return result

        context_match = self._resolve_context_query(message_clean, query_words, request.crop, request.disease, ctx)
        if context_match:
            detail = self._detect_detail_request(message_clean)
            if detail:
                return self._specific_detail_response(context_match, detail)
            result = self._disease_response(context_match)
            result["suggestions"] = self._generate_suggestions(context_match)
            return result

        symptom_match = self._symptom_diagnosis(message_clean, query_words)
        if symptom_match:
            return symptom_match

        general_response = self.general_answers.answer(message_clean, query_words)
        if general_response:
            return {"response": general_response, "matched_class": None, "suggestions": self._general_suggestions()}

        crop_response = self._crop_suggestion_response(message_clean)
        if crop_response:
            return crop_response

        explicit_context = self._explicit_context_fallback(request.crop, request.disease, ctx)
        if explicit_context:
            return explicit_context

        return self._fallback_response()

    def _get_conversation_context(self, history):
        for msg in reversed(history):
            content = msg.get("content", "") if isinstance(msg, dict) else getattr(msg, "content", "")
            content_lower = content.lower()
            full_matches = []
            part_matches = []
            for class_name in CLASS_NAMES:
                if class_name.lower() in content_lower:
                    full_matches.append(class_name)
                disease_part = class_name.split(" - ", 1)[1] if " - " in class_name else ""
                if disease_part and disease_part.lower() in content_lower:
                    part_matches.append(class_name)
            if full_matches:
                return max(full_matches, key=lambda c: len(c))
            if part_matches:
                return max(part_matches, key=lambda c: len(c))
        return None

    def _resolve_context_query(self, message_clean, query_words, request_crop, request_disease, ctx):
        follow_up_triggers = {"tell me more", "explain", "more about", "what about", "how about",
                              "treatment", "treat", "prevention", "prevent", "symptoms",
                              "causes", "cure", "fix", "this", "it"}
        is_follow_up = any(t in message_clean for t in follow_up_triggers)

        if not is_follow_up:
            return None

        target = ctx
        if not target and request_disease and request_crop:
            target = f"{request_crop} - {request_disease}"

        if target and target in self.knowledge_base:
            return target
        return None

    def _explicit_context_fallback(self, request_crop, request_disease, ctx):
        target = None
        if request_crop and request_disease:
            target = f"{request_crop} - {request_disease}"
        if target and target in self.knowledge_base:
            result = self._disease_response(target)
            result["suggestions"] = self._generate_suggestions(target)
            return result
        return None

    def _symptom_diagnosis(self, message_clean, query_words):
        found_crops = [c for c in self.CROP_KEYWORDS if c in message_clean]
        has_symptom_words = bool(query_words & SYMPTOM_KEYWORDS)

        if not found_crops or not has_symptom_words:
            return None

        candidates = []
        for class_name in CLASS_NAMES:
            if any(c in class_name.lower() for c in found_crops):
                disease_part = class_name.split(" - ", 1)[1].lower() if " - " in class_name else ""
                symptom_score = self._symptom_match_score(message_clean, query_words, class_name)
                if disease_part != "healthy":
                    candidates.append((symptom_score, class_name))

        if not candidates:
            return None

        candidates.sort(key=lambda x: x[0], reverse=True)
        top_score = candidates[0][0]

        if top_score >= 2:
            best = candidates[0][1]
            result = self._disease_response(best)
            result["suggestions"] = self._generate_suggestions(best)
            return result

        if top_score >= 0.5:
            likely = [c[1] for c in candidates if c[0] > 0][:4]
            if len(likely) == 1:
                result = self._disease_response(likely[0])
                result["suggestions"] = self._generate_suggestions(likely[0])
                return result
            crop_display = ", ".join(c.capitalize() for c in found_crops)
            lines = [f"I see you're describing symptoms on **{crop_display}**. This could be one of several conditions:"]
            for cls in likely:
                parts = cls.split(" - ", 1)
                lines.append(f"- **{parts[1]}**")
            lines.append("")
            lines.append("Which one matches what you're seeing? Or tell me more details like the color and location of the spots.")
            return {"response": "\n".join(lines), "matched_class": None, "suggestions": [f"Tell me about {cls.split(' - ')[1]}" for cls in likely[:3]]}

        crop = found_crops[0].capitalize()
        response_text = (
            f"You mentioned **{crop}** with some symptoms. "
            f"Could you describe what you see in more detail?\n\n"
            f"For example:\n"
            f"- What color are the spots or patches?\n"
            f"- Where on the plant do you see them? (leaves, stems, fruit)\n"
            f"- Do the leaves look curled, wilted, or dropping?\n\n"
            f"The more details you share, the better I can help diagnose the issue."
        )
        return {"response": response_text, "matched_class": None, "suggestions": [f"My {crop} has brown spots", f"My {crop} leaves are yellowing", f"My {crop} is wilting"]}

    def _symptom_match_score(self, message_clean, query_words, class_name):
        entry = self.knowledge_base.get(class_name)
        if not entry:
            return 0.0
        score = 0.0
        symptoms = entry.get("symptoms", [])
        symptom_text = " ".join(symptoms).lower()
        meaningful_words = query_words & SYMPTOM_KEYWORDS
        for word in meaningful_words:
            if word in symptom_text:
                score += 1.5
        for symptom in symptoms:
            symptom_lower = symptom.lower()
            if symptom_lower[:30] in message_clean:
                score += 3.0
        name_lower = class_name.lower()
        for word in meaningful_words:
            if word in name_lower:
                score += 1.0
        return score

    def _detect_detail_request(self, message_clean):
        if any(w in message_clean for w in ["symptom", "signs"]):
            return "symptoms"
        if any(w in message_clean for w in ["treat", "cure", "medicine", "spray", "fungicide"]):
            return "treatment"
        if any(w in message_clean for w in ["prevent", "avoid", "stop", "protect"]):
            return "prevention"
        if any(w in message_clean for w in ["cause", "why"]):
            return "causes"
        if "immediate" in message_clean or "urgent" in message_clean or "emergency" in message_clean:
            return "immediate_action"
        return None

    def _specific_detail_response(self, matched_class, detail):
        info = self.knowledge_base.get(matched_class, {})
        parts = matched_class.split(" - ", 1)
        disease_name = parts[1] if len(parts) > 1 else matched_class

        section_map = {
            "symptoms": ("Symptoms", info.get("symptoms", [])),
            "treatment": ("Treatment", [info.get("treatment", "No details available.")]),
            "prevention": ("Prevention", [info.get("prevention", "No details available.")]),
            "causes": ("Causes", [info.get("causes", "No details available.")]),
            "immediate_action": ("Immediate Action", [info.get("immediate_action", "No details available.")]),
        }

        title, content = section_map.get(detail, (detail, ["No information available."]))
        items = "\n".join(f"- {item}" for item in content)
        response_text = f"**{disease_name} — {title}**\n\n{items}"

        remaining = self._generate_suggestions(matched_class)
        detail_variants = {
            "symptoms": ["symptoms", "symptom"],
            "treatment": ["treatment", "treat", "cure"],
            "causes": ["causes", "cause"],
            "prevention": ["prevention", "prevent"],
            "immediate_action": ["immediate", "urgent"],
        }
        exclude_words = detail_variants.get(detail, [detail.lower()])
        remaining = [s for s in remaining if not any(w in s.lower() for w in exclude_words)]
        if not remaining:
            remaining = self._general_suggestions()

        return {"response": response_text, "matched_class": matched_class, "suggestions": remaining[:4]}

    def _generate_suggestions(self, matched_class):
        entry = self.knowledge_base.get(matched_class, {})
        parts = matched_class.split(" - ", 1)
        disease_name = parts[1] if len(parts) > 1 else matched_class
        suggestions = []
        if entry.get("symptoms"):
            suggestions.append(f"What are the symptoms of {disease_name}?")
        if entry.get("treatment"):
            suggestions.append(f"How do I treat {disease_name}?")
        if entry.get("causes"):
            suggestions.append(f"What causes {disease_name}?")
        if entry.get("prevention"):
            suggestions.append(f"How can I prevent {disease_name}?")
        if entry.get("immediate_action"):
            suggestions.append(f"What should I do immediately for {disease_name}?")
        return suggestions[:4]

    def _general_suggestions(self):
        return [
            "What is plant disease?",
            "How can I prevent plant diseases?",
            "What are common symptoms?",
            "Tell me about tomato diseases",
        ]

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
        parts = matched_class.split(" - ", 1)
        disease_name = parts[1] if len(parts) > 1 else matched_class
        cause_text = info.get("causes", "")

        intro = f"**{info.get('name', matched_class)}**\n\n"
        if cause_text:
            intro += f"{disease_name} is a plant disease caused by {cause_text.strip('.')}."
        else:
            intro += f"{disease_name} is a condition that affects {parts[0] if len(parts) > 1 else 'plants'}."

        symptoms_list = info.get("symptoms", [])
        if symptoms_list:
            intro += f"\n\nTypical symptoms include {symptoms_list[0].lower().strip('.')}."

        intro += "\n\nWhat would you like to know more about?"

        return {"response": intro, "matched_class": matched_class, "suggestions": self._generate_suggestions(matched_class)}

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
        suggestion_list = [s.replace("- ", "") for s in suggestions[:3]]
        response_text = (
            f"It looks like you are asking about **{', '.join([crop.capitalize() for crop in found_crops])}**.\n"
            f"I found the following conditions for this crop in my knowledge base:\n\n"
            f"{suggestions_text}\n\n"
            f"Please specify which condition you would like help with."
        )
        return {"response": response_text, "matched_class": None, "suggestions": [f"Tell me about {s}" for s in suggestion_list]}

    def _fallback_response(self):
        response_text = (
            "Hello! I am **PlantGuard AI**, your virtual agronomist. I help diagnose "
            "and treat plant diseases using our local database. How can I help you today?\n\n"
            "**Supported Crops**\n"
            f"I support: {supported_crops_text()}.\n\n"
            "Try asking a general question like *\"What is plant disease?\"* or a specific condition like *\"How do I treat Early Blight in Potatoes?\"*"
        )
        return {"response": response_text, "matched_class": None, "suggestions": self._general_suggestions()}
