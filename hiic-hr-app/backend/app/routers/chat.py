from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
import logging
from app.models.hr_models import ChatMessage, ChatRequest, ChatResponse
from app.services.chat_service import hr_chat_service
from app.services.enhanced_chat_service import enhanced_hr_chat_service
from app.services.hybrid_chat_service import hybrid_chat_service
from app.services.question_classifier import question_classifier

# 配置日志
logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["chat"],
    responses={404: {"description": "Not found"}},
)

@router.post("/send", response_model=ChatResponse)
async def send_message(request: ChatRequest) -> ChatResponse:
    """智能路由聊天消息，根据问题类型选择合适的处理方式"""
    import asyncio
    from app.core.config import settings
    
    try:
        # 获取最后一条用户消息
        last_user_message = next((msg.content for msg in reversed(request.messages) 
                                if msg.role == "user"), None)
        
        if not last_user_message:
            return ChatResponse(response="无法识别用户消息")
        
        # 使用新的问题分类器对问题进行分类
        question_type = await question_classifier.classify(last_user_message)
        logger.info(f"问题 '{last_user_message[:30]}...' 被分类为: {question_type}")
        
        # 设置超时时间，比模型超时略长以确保能捕获模型的超时响应
        timeout_seconds = settings.MODEL_TIMEOUT + 10
        logger.info(f"请求超时设置为: {timeout_seconds}秒")
        
        # 添加超时机制
        try:
            # 根据分类结果选择处理服务
            if question_type.startswith("tool:"):
                # 工具类问题使用增强聊天服务
                tool_name = question_type.split(":")[1]
                task = asyncio.create_task(enhanced_hr_chat_service.get_response(request.messages, preferred_tool=tool_name))
            elif question_type == "SQL_QUERY" or question_type == "sql" or question_type == "GENERAL_QUERY":
                # SQL查询类问题和一般问题都使用混合聊天服务
                task = asyncio.create_task(hybrid_chat_service.get_response(request.messages))
            elif question_type == "VISUALIZATION":
                # 可视化类问题使用混合聊天服务
                task = asyncio.create_task(hybrid_chat_service.get_response(request.messages))
            elif question_type == "DATA_ANALYSIS":
                # 数据分析类问题使用混合聊天服务
                task = asyncio.create_task(hybrid_chat_service.get_response(request.messages))
            else:
                # 其他问题类型使用混合聊天服务
                task = asyncio.create_task(hybrid_chat_service.get_response(request.messages))
                
            # 等待任务完成或超时
            response = await asyncio.wait_for(task, timeout=timeout_seconds)
            
        except asyncio.TimeoutError:
            logger.error(f"请求处理超时，超过{timeout_seconds}秒")
            # 检查任务是否已经完成但只是超时
            if hasattr(task, 'done') and task.done():
                try:
                    # 虽然超时但任务已完成，获取结果
                    logger.info("尽管超时，但任务已完成，获取其结果")
                    response = task.result()
                except Exception as e:
                    # 获取结果时发生错误
                    logger.error(f"获取超时任务结果时出错: {str(e)}")
                    response = "抱歉，您的请求处理时间较长，但我们仍在处理中。请稍后再试或尝试简化您的问题。"
            else:
                # 真正的超时，提供友好提示
                response = "抱歉，处理您的请求时间超过了预期。这可能是因为您的问题较为复杂或系统当前负载较高。请稍后再试或尝试简化您的问题。"
        
        # 检查回答质量
        if _is_low_quality_response(response):
            # 如果回答质量不佳，尝试使用混合查询服务
            logger.info(f"检测到低质量回答，尝试混合查询服务")
            try:
                fallback_response = await hybrid_chat_service.get_response(request.messages)
                
                # 如果混合查询服务提供了更好的回答，使用它
                if not _is_low_quality_response(fallback_response):
                    logger.info(f"使用混合查询服务的回答替代原回答")
                    response = fallback_response
            except Exception as fallback_e:
                logger.error(f"混合查询服务回退失败: {str(fallback_e)}")
        
        return ChatResponse(response=response)
    except Exception as e:
        logger.error(f"处理消息时出错: {str(e)}", exc_info=True)
        return ChatResponse(response=f"处理您的请求时遇到了问题，请稍后再试。如果问题持续存在，请联系管理员。错误详情: {str(e)[:100]}...")

# 保留原来的专用端点，但将它们重定向到智能路由
@router.post("/enhanced/send", response_model=ChatResponse)
async def send_enhanced_message(request: ChatRequest) -> ChatResponse:
    """发送增强聊天消息（工具调用方式）"""
    logger.info("通过enhanced端点发送消息，转发到智能路由")
    return await send_message(request)

@router.post("/hybrid/send", response_model=ChatResponse)
async def send_hybrid_message(request: ChatRequest) -> ChatResponse:
    """发送混合聊天消息（工具调用+SQL方式）"""
    logger.info("通过hybrid端点发送消息，转发到智能路由")
    return await send_message(request)

@router.get("/health")
async def health_check() -> Dict[str, str]:
    """健康检查"""
    return {"status": "ok", "message": "Chat service is running"}

def _is_low_quality_response(response: str) -> bool:
    """检测回答是否为低质量（无法回答）"""
    if not response:
        return True
    
    # 检查是否包含常见的无法回答标志
    low_quality_indicators = [
        "抱歉，我没有相关信息",
        "很抱歉，我目前没有",
        "抱歉，我无法获取",
        "我无法回答这个问题",
        "我没有访问权限",
        "我无法获取",
        "无法告诉您",
        "没有相关数据"
    ]
    
    return any(indicator in response for indicator in low_quality_indicators) 