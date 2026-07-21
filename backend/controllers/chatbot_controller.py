from fastapi import APIRouter

from services.app_services import chatbot_service

router = APIRouter()


@router.get("/guides")
def get_guides():
    return chatbot_service.list_guides()

