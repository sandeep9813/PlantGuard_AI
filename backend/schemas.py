from pydantic import BaseModel


class AddHistoryRequest(BaseModel):
    prediction: str
    confidence: float
    is_uncertain: bool = False
    confidence_message: str | None = None
    is_ood: bool = False
    ood_message: str | None = None
    entropy: float | None = None
    heatmap: str | None = None
    top_3: list[dict] = []
    date: str | None = None
    image_path: str | None = None
