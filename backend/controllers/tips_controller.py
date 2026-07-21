import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/tips")

TIPS_PATH = Path(__file__).resolve().parent.parent / "data" / "expert_tips.json"


def _load_tips():
    if not TIPS_PATH.exists():
        return []
    with open(TIPS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("")
def get_tips():
    return _load_tips()


@router.get("/{tip_id}")
def get_tip(tip_id: int):
    tips = _load_tips()
    for tip in tips:
        if tip["id"] == tip_id:
            return tip
    raise HTTPException(status_code=404, detail="Tip not found")
