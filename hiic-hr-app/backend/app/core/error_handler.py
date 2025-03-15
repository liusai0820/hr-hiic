from fastapi import Request, status
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError
import traceback
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AppException(Exception):
    """自定义应用异常基类"""
    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        message: str = "服务器内部错误",
        details: Optional[Dict[str, Any]] = None
    ):
        self.status_code = status_code
        self.message = message
        self.details = details or {}
        super().__init__(self.message)

class ValidationException(AppException):
    """数据验证异常"""
    def __init__(self, message: str = "数据验证错误", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            message=message,
            details=details
        )

class DatabaseException(AppException):
    """数据库操作异常"""
    def __init__(self, message: str = "数据库操作错误", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=message,
            details=details
        )

class AuthenticationException(AppException):
    """认证异常"""
    def __init__(self, message: str = "认证失败", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=message,
            details=details
        )

class AuthorizationException(AppException):
    """授权异常"""
    def __init__(self, message: str = "权限不足", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=message,
            details=details
        )

class NotFoundException(AppException):
    """资源未找到异常"""
    def __init__(self, message: str = "资源未找到", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=message,
            details=details
        )

async def error_handler_middleware(request: Request, call_next):
    """全局错误处理中间件"""
    try:
        # 尝试处理请求
        response = await call_next(request)
        return response
    except Exception as e:
        # 记录错误
        error_detail = traceback.format_exc()
        logger.error(f"请求处理错误: {str(e)}")
        logger.error(f"错误详情: {error_detail}")
        
        # 返回错误响应
        return JSONResponse(
            status_code=500,
            content={
                "error": "服务器内部错误",
                "message": str(e),
                "path": request.url.path
            }
        ) 