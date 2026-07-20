import logging

from .knowledge_base import get_disease_info, format_disease_context
from .models import ChatRequest, ChatResponse
from .ollama_client import generate, OllamaError
from .prompt_builder import build_system_prompt, build_messages
from services.chatbot_service import ChatRequest as FallbackChatRequest

logger = logging.getLogger(__name__)


def _get_fallback():
    from services.app_services import chatbot_service
    return chatbot_service


async def answer(request: ChatRequest) -> ChatResponse:
    entry = get_disease_info(request.crop, request.disease)
    disease_context = format_disease_context(entry) if entry else None

    system_prompt = build_system_prompt(
        crop=request.crop,
        disease=request.disease,
        confidence=request.confidence,
        disease_context=disease_context,
    )

    messages = build_messages(system_prompt, request.chat_history, request.question)

    try:
        answer_text = await generate(messages)
        return ChatResponse(answer=answer_text, sources=["knowledge_base", "ollama"])
    except OllamaError as e:
        logger.warning("Ollama unavailable, falling back to rule-based chatbot: %s", e)
        return _fallback_answer(request)


def _fallback_answer(request: ChatRequest) -> ChatResponse:
    fallback = _get_fallback()

    old_req = FallbackChatRequest(
        message=request.question,
        history=[{"role": m.role, "content": m.content} for m in request.chat_history],
    )

    try:
        result = fallback.answer(old_req)
        return ChatResponse(answer=result["response"], sources=["knowledge_base"])
    except Exception as e:
        logger.exception("Fallback chatbot also failed")
        return ChatResponse(
            answer=(
                "I'm sorry, but I'm having trouble connecting to my knowledge base. "
                "Please make sure the backend and Ollama are running properly."
            ),
            sources=[],
        )
