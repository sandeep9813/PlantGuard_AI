import json
from datetime import datetime

from sqlalchemy.orm import Session

from database.models import Prediction


class DashboardService:
    def __init__(self, db: Session, species_count: int = 0):
        self.db = db
        self.species_count = species_count

    def _get_items(self):
        return self.db.query(Prediction).order_by(Prediction.created_at.desc()).all()

    def _current_month_count(self, items):
        now = datetime.now()
        count = 0
        for item in items:
            try:
                item_date = datetime.strptime(item.date, "%m/%d/%Y, %I:%M:%S %p") if item.date else item.created_at
                if item_date.month == now.month and item_date.year == now.year:
                    count += 1
            except (ValueError, TypeError):
                pass
        return count

    def _previous_month_count(self, items):
        now = datetime.now()
        prev_month = now.month - 1 if now.month > 1 else 12
        prev_year = now.year if now.month > 1 else now.year - 1
        count = 0
        for item in items:
            try:
                item_date = datetime.strptime(item.date, "%m/%d/%Y, %I:%M:%S %p") if item.date else item.created_at
                if item_date.month == prev_month and item_date.year == prev_year:
                    count += 1
            except (ValueError, TypeError):
                pass
        return count

    def get_stats(self):
        items = self._get_items()
        total = len(items)
        monthly = self._current_month_count(items)
        previous = self._previous_month_count(items)

        change_pct = 0
        if previous > 0:
            change_pct = round(((monthly - previous) / previous) * 100)

        healthy_count = sum(
            1 for item in items
            if item.prediction.strip().lower() == "healthy"
        )
        health_score = round((healthy_count / total) * 100, 1) if total > 0 else 0

        alerts = sum(
            1 for item in items
            if item.prediction.strip().lower() != "healthy"
        )
        pending = sum(1 for item in items if item.is_uncertain)

        confidences = [item.confidence for item in items if isinstance(item.confidence, (int, float))]
        accuracy_rate = round(sum(confidences) / len(confidences), 1) if confidences else 98.0

        return {
            "total_scans": total,
            "monthly_scans": monthly,
            "monthly_change_percent": change_pct,
            "health_score": health_score,
            "health_score_trend": "stable",
            "active_alerts": alerts,
            "alerts_priority": "High" if alerts > 0 else "None",
            "reports_pending": pending,
            "accuracy_rate": accuracy_rate,
            "species_count": self.species_count,
        }

    def get_recent(self, limit: int = 5):
        items = self._get_items()
        result = []
        for item in items[:limit]:
            top_3 = json.loads(item.top_3) if item.top_3 else []
            result.append({
                "id": item.id,
                "date": item.date or item.created_at.strftime("%m/%d/%Y, %I:%M:%S %p"),
                "prediction": item.prediction,
                "confidence": item.confidence,
                "is_uncertain": item.is_uncertain,
            })
        return result
