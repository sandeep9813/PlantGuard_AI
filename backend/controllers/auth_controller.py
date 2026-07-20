from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from core.auth import hash_password, verify_password, create_access_token, get_current_user
from core.database import get_db
from database.models import User

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["auth"])


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


@router.post("/signup", response_model=AuthResponse)
@limiter.limit("5/minute")
def signup(req: SignupRequest, request: Request, db: Session = Depends(get_db)):
    if not req.name.strip() or not req.email.strip() or len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Name, valid email, and password (min 8 characters) required")

    email = req.email.strip().lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = User(name=req.name.strip(), email=email, password=hash_password(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return AuthResponse(token=token, user={"id": user.id, "name": user.name, "email": user.email})


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(req.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.id)
    return AuthResponse(token=token, user={"id": user.id, "name": user.name, "email": user.email})


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    if current_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"id": current_user.id, "name": current_user.name, "email": current_user.email}
