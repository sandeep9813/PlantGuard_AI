from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ai.class_names import CLASS_NAMES
from core.database import get_db
from services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard")


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    service = DashboardService(db, species_count=len(CLASS_NAMES))
    return service.get_stats()


@router.get("/recent")
def get_recent(db: Session = Depends(get_db)):
    service = DashboardService(db)
    return service.get_recent()
