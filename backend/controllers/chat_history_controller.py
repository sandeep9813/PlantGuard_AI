from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.database import get_db
from database.models import User, ChatSession, ChatMessage

router = APIRouter(prefix="/chat", tags=["chat_history"])


class ChatMessageCreate(BaseModel):
    role: str
    content: str


class ChatSessionCreate(BaseModel):
    crop: str = ""
    disease: str = ""
    messages: list[ChatMessageCreate] = []


@router.get("/sessions")
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    query = db.query(ChatSession).order_by(ChatSession.created_at.desc())
    if current_user:
        query = query.filter(ChatSession.user_id == current_user.id)
    else:
        query = query.filter(ChatSession.user_id.is_(None))
    sessions = query.all()
    return [
        {
            "id": s.id,
            "crop": s.crop,
            "disease": s.disease,
            "message_count": len(s.messages),
            "created_at": s.created_at.isoformat() + "Z",
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}")
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if current_user and session.user_id and session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return {
        "id": session.id,
        "crop": session.crop,
        "disease": session.disease,
        "created_at": session.created_at.isoformat() + "Z",
        "messages": [
            {"role": m.role, "content": m.content, "created_at": m.created_at.isoformat() + "Z"}
            for m in session.messages
        ],
    }


@router.post("/sessions")
def create_session(
    req: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    session = ChatSession(
        user_id=current_user.id if current_user else None,
        crop=req.crop,
        disease=req.disease,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    for m in req.messages:
        db.add(ChatMessage(session_id=session.id, role=m.role, content=m.content))
    db.commit()
    return {
        "id": session.id,
        "crop": session.crop,
        "disease": session.disease,
        "message_count": len(req.messages),
    }


@router.post("/sessions/{session_id}/messages")
def add_message(
    session_id: int,
    msg: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    record = ChatMessage(session_id=session_id, role=msg.role, content=msg.content)
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "role": record.role, "content": record.content}


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"deleted": True}
