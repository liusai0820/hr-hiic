from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from supabase import create_client, Client
from app.core.config import settings
import logging
import json

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class AdminCreateRequest(BaseModel):
    email: str
    password: str

def serialize_user(user: Any) -> Dict[str, Any]:
    """将 User 对象转换为可序列化的字典"""
    if not user:
        return {}
    
    return {
        "id": str(getattr(user, "id", "")),
        "email": getattr(user, "email", ""),
        "role": "admin",
        "created_at": str(getattr(user, "created_at", "")),
        "user_metadata": getattr(user, "user_metadata", {})
    }

@router.post("/create")
async def create_admin(request: AdminCreateRequest):
    try:
        logger.info("开始创建管理员账号")
        logger.info(f"使用的 Supabase URL: {settings.SUPABASE_URL}")
        logger.info(f"Supabase Key 是否存在: {bool(settings.SUPABASE_KEY)}")
        
        # 使用 SUPABASE_KEY 创建 Supabase 客户端
        try:
            supabase = create_client(
                supabase_url=settings.SUPABASE_URL,
                supabase_key=settings.SUPABASE_KEY
            )
            logger.info("Supabase 客户端创建成功")
        except Exception as e:
            logger.error(f"创建 Supabase 客户端失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"创建 Supabase 客户端失败: {str(e)}")

        # 准备用户数据
        user_data = {
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "role": "admin",
                    "approved": True,
                    "姓名": "Admin",
                    "性别": "男",
                    "年龄": 30,
                    "部门": "管理部",
                    "职位": "系统管理员"
                }
            }
        }
        logger.info(f"准备创建用户数据: {json.dumps(user_data, ensure_ascii=False)}")
        
        # 使用 signUp 方法创建用户
        try:
            response = supabase.auth.sign_up(user_data)
            logger.info("用户注册API调用成功，正在处理响应")
            logger.info(f"响应数据: {response}")
            
            if not response or not response.user:
                raise HTTPException(status_code=400, detail="用户创建失败，未返回用户数据")
            
        except Exception as e:
            logger.error(f"调用 sign_up API 失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"调用 sign_up API 失败: {str(e)}")
        
        # 序列化用户数据
        serialized_user = serialize_user(response.user)
        logger.info(f"管理员账号创建成功: {json.dumps(serialized_user, ensure_ascii=False)}")
        
        # 更新用户角色
        try:
            update_response = supabase.auth.admin.update_user_by_id(
                response.user.id,
                {"role": "admin", "approved": True}
            )
            logger.info("用户角色更新成功")
        except Exception as e:
            logger.warning(f"更新用户角色失败: {str(e)}")
        
        return {
            "message": "管理员账号创建成功",
            "user": serialized_user
        }
            
    except Exception as e:
        logger.error(f"创建管理员账号时发生错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"创建管理员账号失败: {str(e)}") 