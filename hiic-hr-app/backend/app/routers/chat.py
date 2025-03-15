from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from app.models.hr_models import ChatMessage, ChatRequest, ChatResponse
from app.services.chat_service import hr_chat_service
from app.services.enhanced_chat_service import enhanced_hr_chat_service
from app.services.hybrid_chat_service import hybrid_chat_service

router = APIRouter(
    tags=["chat"],
    responses={404: {"description": "Not found"}},
)

@router.post("/send", response_model=ChatResponse)
async def send_message(request: ChatRequest) -> ChatResponse:
    """发送聊天消息（传统方式）"""
    try:
        response = hr_chat_service.get_response(request.messages)
        return ChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enhanced/send", response_model=ChatResponse)
async def send_enhanced_message(request: ChatRequest) -> ChatResponse:
    """发送增强聊天消息（工具调用方式）"""
    try:
        response = await enhanced_hr_chat_service.get_response(request.messages)
        return ChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/hybrid/send", response_model=ChatResponse)
async def send_hybrid_message(request: ChatRequest) -> ChatResponse:
    """发送混合聊天消息（工具调用+SQL方式）"""
    try:
        response = await hybrid_chat_service.get_response(request.messages)
        return ChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check() -> Dict[str, str]:
    """健康检查"""
    return {"status": "ok", "message": "Chat service is running"} 