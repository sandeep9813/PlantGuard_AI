from pydantic import BaseModel
from typing import Optional


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    crop: str
    disease: str
    confidence: float
    question: str
    chat_history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    answer: str
    sources: list[str] = ["knowledge_base"]
