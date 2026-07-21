from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ai.class_names import CLASS_NAMES
from core.auth import get_current_user
from core.database import get_db
from database.models import User
from services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard")


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    service = DashboardService(db, species_count=len(CLASS_NAMES))
    return service.get_stats(user_id=current_user.id if current_user else None)


@router.get("/recent")
def get_recent(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    service = DashboardService(db)
    return service.get_recent(user_id=current_user.id if current_user else None)
