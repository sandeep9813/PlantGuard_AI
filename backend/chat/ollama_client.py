import logging
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

from .models import ChatMessage

# Load .env from the backend root (one level up from this file)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "60"))


class OllamaError(Exception):
    pass


async def generate(
    messages: list[ChatMessage],
    *,
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 512,
) -> str:
    url = f"{OLLAMA_BASE_URL}/api/chat"
    model = model or OLLAMA_MODEL

    payload = {
        "model": model,
        "messages": [{"role": m.role, "content": m.content} for m in messages],
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
            "num_ctx": 2048,
        },
        "keep_alive": "5m",
        "stream": False,
    }

    logger.info("Sending request to Ollama (model=%s)", model)
    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
    except httpx.ConnectError:
        raise OllamaError(
            f"Cannot connect to Ollama at {OLLAMA_BASE_URL}. "
            "Make sure Ollama is running (ollama serve)."
        )
    except httpx.TimeoutException:
        raise OllamaError(
            f"Ollama request timed out after {OLLAMA_TIMEOUT}s."
        )
    except httpx.HTTPStatusError as e:
        raise OllamaError(f"Ollama returned HTTP {e.response.status_code}: {e.response.text}")

    return data.get("message", {}).get("content", "").strip()
