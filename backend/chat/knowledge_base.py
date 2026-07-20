import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_KB_PATH = Path(__file__).resolve().parent.parent / "knowledge_base" / "disease_knowledge.json"
_cache: Optional[dict] = None


def _load() -> dict:
    global _cache
    if _cache is not None:
        return _cache
    try:
        with open(_KB_PATH, encoding="utf-8") as f:
            _cache = json.load(f)
        logger.info("Loaded %d disease entries from knowledge base", len(_cache))
    except FileNotFoundError:
        logger.warning("Knowledge base not found at %s", _KB_PATH)
        _cache = {}
    return _cache


def get_disease_info(crop: str, disease: str) -> Optional[dict]:
    kb = _load()
    key = f"{crop} - {disease}"
    entry = kb.get(key)
    if entry is None:
        logger.warning("No knowledge base entry for '%s'", key)
        return None
    return entry


def format_disease_context(entry: dict) -> str:
    parts = []
    if entry.get("symptoms"):
        parts.append("Symptoms: " + ", ".join(entry["symptoms"]))
    if entry.get("causes"):
        parts.append("Causes: " + entry["causes"])
    if entry.get("treatment"):
        parts.append("Treatment: " + entry["treatment"])
    if entry.get("prevention"):
        parts.append("Prevention: " + entry["prevention"])
    if entry.get("immediate_action"):
        parts.append("Immediate action: " + entry["immediate_action"])
    return "\n".join(parts)
