import logging
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.database import get_db
from database.models import User, ChatSession, ChatMessage
from .models import ChatRequest, ChatResponse
from .chat_service import answer

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    session_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    result = await answer(request)

    user_id = current_user.id if current_user else None
    session: ChatSession | None = None

    if session_id:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()

    if session is None:
        session = ChatSession(
            user_id=user_id,
            crop=request.crop,
            disease=request.disease,
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    db.add(ChatMessage(session_id=session.id, role="user", content=request.question))
    db.add(ChatMessage(session_id=session.id, role="assistant", content=result.answer))
    db.commit()
    
    result.session_id = session_id
    return result
