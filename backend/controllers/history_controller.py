from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.database import get_db
from database.models import User
from services.history_service import HistoryService

router = APIRouter(prefix="/history")


@router.get("")
def get_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    service = HistoryService(db)
    user_id = current_user.id if current_user else None
    return service.list_history(user_id=user_id, page=page, per_page=per_page)


@router.post("")
def add_history(
    item: dict,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    service = HistoryService(db)
    user_id = current_user.id if current_user else None
    return service.add_history(item, user_id=user_id)


@router.delete("/{item_id}")
def delete_history_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    service = HistoryService(db)
    user_id = current_user.id if current_user else None
    deleted = service.delete_item(item_id, user_id=user_id)
    if not deleted:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Item not found")
    return {"deleted": True}


@router.delete("")
def clear_history(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    service = HistoryService(db)
    user_id = current_user.id if current_user else None
    return service.clear_history(user_id=user_id)
