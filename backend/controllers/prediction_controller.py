import base64
import time
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.database import get_db
from database.models import User
from services.app_services import prediction_service
from services.history_service import HistoryService

router = APIRouter()

HEATMAP_DIR = Path(__file__).resolve().parents[1] / "storage" / "heatmaps"
UPLOADS_DIR = Path(__file__).resolve().parents[1] / "storage" / "uploads"


@router.post("/predict")
async def predict(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    result = await prediction_service.predict(file)
    item_id = int(time.time() * 1000)

    heatmap_data = result.get("heatmap")
    if heatmap_data and heatmap_data.startswith("data:image/png;base64,"):
        raw = heatmap_data.split(",")[1]
        HEATMAP_DIR.mkdir(parents=True, exist_ok=True)
        (HEATMAP_DIR / f"{item_id}.png").write_bytes(base64.b64decode(raw))
        result["heatmap"] = f"/heatmaps/{item_id}.png"

    image_path = None
    try:
        await file.seek(0)
        image_bytes = await file.read()
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        (UPLOADS_DIR / f"{item_id}.jpg").write_bytes(image_bytes)
        image_path = f"/uploads/{item_id}.jpg"
    except Exception:
        pass

    history_service = HistoryService(db)
    history_service.add_history({
        "id": item_id,
        "date": datetime.now().strftime("%m/%d/%Y, %I:%M:%S %p"),
        "prediction": result["prediction"],
        "confidence": result["confidence"],
        "is_uncertain": result["is_uncertain"],
        "confidence_message": result["confidence_message"],
        "heatmap": result.get("heatmap"),
        "top_3": result.get("top_3", []),
        "image_path": image_path,
    }, user_id=current_user.id if current_user else None)

    return result
