import base64
import logging
from pathlib import Path
import uuid
from datetime import datetime

from schemas import AddHistoryRequest

from fastapi import APIRouter, Depends, File, UploadFile, Request

from controllers.auth_controller import limiter

logger = logging.getLogger(__name__)
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
@limiter.limit("10/minute")
async def predict(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    result = await prediction_service.predict(file)
    item_id = uuid.uuid4().hex

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
    except Exception as e:
        logger.warning("Failed to save uploaded image: %s", e)

    history_service = HistoryService(db)
    history_service.add_history(
    AddHistoryRequest(
        prediction=result["prediction"],
        confidence=result["confidence"],
        is_uncertain=result["is_uncertain"],
        confidence_message=result["confidence_message"],
        is_ood=result["is_ood"],
        ood_message=result["ood_message"],
        entropy=result.get("entropy"),
        heatmap=result.get("heatmap"),
        top_3=result.get("top_3", []),
        image_path=image_path,
        date=datetime.now().strftime("%m/%d/%Y, %I:%M:%S %p"),
    ),
    user_id=current_user.id if current_user else None,
)

    return result
