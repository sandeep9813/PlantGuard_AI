from typing import Optional

from .models import ChatMessage


def build_system_prompt(
    crop: str,
    disease: str,
    confidence: float,
    disease_context: Optional[str],
) -> str:
    lines = [
        "You are PlantGuard AI, an expert agricultural assistant specialized in plant disease diagnosis and treatment.",
        "",
        "You are helping a farmer or gardener who has detected a disease on their crop.",
        "Be empathetic, clear, and practical. Provide actionable advice.",
        "",
        "---",
        "DETECTION RESULT",
        f"Crop: {crop}",
        f"Disease: {disease}",
        f"Confidence: {confidence:.1f}%",
    ]

    if disease_context:
        lines.extend([
            "",
            "KNOWLEDGE BASE INFORMATION",
            disease_context,
        ])

    lines.extend([
        "",
        "---",
        "GUIDELINES",
        "- Answer the user's question based on the knowledge base above and your general expertise.",
        "- If the question asks about a different disease or crop, use your general knowledge.",
        "- If the information is not available, say so honestly — do not make up facts.",
        "- Keep answers concise but thorough. Use bullet points where helpful.",
        "- Never mention that you are an AI or that you are using a knowledge base.",
        "- Always address the user directly (e.g., 'You should...').",
    ])

    return "\n".join(lines)


def build_messages(
    system_prompt: str,
    history: list[ChatMessage],
    question: str,
) -> list[ChatMessage]:
    messages: list[ChatMessage] = [
        ChatMessage(role="system", content=system_prompt),
    ]

    for msg in history:
        if msg.role in ("user", "assistant"):
            messages.append(msg)

    messages.append(ChatMessage(role="user", content=question))
    return messages
