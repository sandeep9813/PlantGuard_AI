import json
from datetime import datetime

from sqlalchemy.orm import Session

from database.models import Prediction


class DashboardService:
    def __init__(self, db: Session, species_count: int = 0):
        self.db = db
        self.species_count = species_count

    def _get_items(self, user_id: int | None = None):
        query = self.db.query(Prediction).order_by(Prediction.created_at.desc())
        if user_id is not None:
            query = query.filter(Prediction.user_id == user_id)
        return query.all()

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

    def _date_in_range(self, item, prev_month: bool = False):
        now = datetime.now()
        if prev_month:
            target_month = now.month - 1 if now.month > 1 else 12
            target_year = now.year if now.month > 1 else now.year - 1
        else:
            target_month = now.month
            target_year = now.year
        try:
            item_date = datetime.strptime(item.date, "%m/%d/%Y, %I:%M:%S %p") if item.date else item.created_at
            return item_date.month == target_month and item_date.year == target_year
        except (ValueError, TypeError):
            return False

    def get_stats(self, user_id: int | None = None):
        items = self._get_items(user_id)
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

        prev_healthy = sum(
            1 for item in items
            if item.prediction.strip().lower() == "healthy"
            and self._date_in_range(item, prev_month=True)
        )
        prev_total = sum(1 for item in items if self._date_in_range(item, prev_month=True))
        prev_health_score = round((prev_healthy / prev_total) * 100, 1) if prev_total > 0 else health_score

        if health_score > prev_health_score + 1:
            trend = "improving"
        elif health_score < prev_health_score - 1:
            trend = "declining"
        else:
            trend = "stable"

        return {
            "total_scans": total,
            "monthly_scans": monthly,
            "monthly_change_percent": change_pct,
            "health_score": health_score,
            "health_score_trend": trend,
            "active_alerts": alerts,
            "alerts_priority": "High" if alerts > 0 else "None",
            "reports_pending": pending,
            "accuracy_rate": accuracy_rate,
            "species_count": self.species_count,
        }

    def get_recent(self, limit: int = 5, user_id: int | None = None):
        items = self._get_items(user_id)
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
