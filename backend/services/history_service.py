import json

from sqlalchemy.orm import Session

from database.models import Prediction
from schemas import AddHistoryRequest


class HistoryService:
    def __init__(self, db: Session):
        self.db = db

    def list_history(self, user_id: int | None = None, page: int = 1, per_page: int = 20):
        query = self.db.query(Prediction).order_by(Prediction.created_at.desc())
        if user_id is not None:
            query = query.filter(Prediction.user_id == user_id)
        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        return {
            "items": [self._to_dict(r) for r in items],
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": max(1, (total + per_page - 1) // per_page),
        }

    def add_history(self, item: AddHistoryRequest, user_id: int | None = None):
        record = Prediction(
            user_id=user_id,
            image_path=item.image_path,
            prediction=item.prediction,
            confidence=item.confidence,
            is_uncertain=item.is_uncertain,
            confidence_message=item.confidence_message,
            is_ood=item.is_ood,
            ood_message=item.ood_message,
            entropy=item.entropy,
            heatmap_path=item.heatmap,
            top_3=json.dumps(item.top_3 or []),
            date=item.date,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return self._to_dict(record)

    def clear_history(self, user_id: int | None = None):
        query = self.db.query(Prediction)
        if user_id is not None:
            query = query.filter(Prediction.user_id == user_id)
        query.delete()
        self.db.commit()
        return {"cleared": True}

    def delete_item(self, item_id: int, user_id: int | None = None):
        query = self.db.query(Prediction).filter(Prediction.id == item_id)
        if user_id is not None:
            query = query.filter(Prediction.user_id == user_id)
        record = query.first()
        if record:
            self.db.delete(record)
            self.db.commit()
            return True
        return False

    def _to_dict(self, record: Prediction) -> dict:
        return {
            "id": record.id,
            "date": record.date or record.created_at.strftime("%m/%d/%Y, %I:%M:%S %p"),
            "prediction": record.prediction,
            "confidence": record.confidence,
            "is_uncertain": record.is_uncertain,
            "confidence_message": record.confidence_message,
            "is_ood": record.is_ood,
            "ood_message": record.ood_message,
            "entropy": record.entropy,
            "heatmap": record.heatmap_path,
            "top_3": json.loads(record.top_3) if record.top_3 else [],
            "image_path": record.image_path,
        }
