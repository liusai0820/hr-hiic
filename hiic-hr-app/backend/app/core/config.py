import os
import logging
from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv, find_dotenv

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 加载环境变量
env_path = find_dotenv()
if env_path:
    logger.info(f"找到 .env 文件: {env_path}")
    load_dotenv(env_path)
else:
    logger.warning("未找到 .env 文件")

# 验证关键环境变量
logger.info(f"SUPABASE_URL: {os.getenv('SUPABASE_URL', '未设置')}")
logger.info(f"SUPABASE_SERVICE_ROLE_KEY 是否存在: {bool(os.getenv('SUPABASE_SERVICE_ROLE_KEY'))}")

class Settings(BaseSettings):
    """应用配置设置"""
    APP_NAME: str = "HIIC HR AI应用"
    APP_VERSION: str = "0.1.0"
    APP_DESCRIPTION: str = "基于HR数据的AI对话和分析应用"
    
    # Supabase配置
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_TABLE: str = os.getenv("SUPABASE_TABLE", "employees")
    
    # OpenRouter基础配置
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_API_URL: str = os.getenv("OPENROUTER_API_URL", "https://openrouter.ai/api/v1/chat/completions")
    
    # 模型配置
    # 问题分类模型（轻量级、低延迟）
    CLASSIFIER_MODEL: str = os.getenv("CLASSIFIER_MODEL", "google/gemma-3-7b-it:free")
    CLASSIFIER_TEMPERATURE: float = float(os.getenv("CLASSIFIER_TEMPERATURE", "0.1"))
    CLASSIFIER_MAX_TOKENS: int = int(os.getenv("CLASSIFIER_MAX_TOKENS", "10"))
    
    # 聊天服务模型（通用对话）
    CHAT_MODEL: str = os.getenv("CHAT_MODEL", "google/gemma-3-27b-it:free")
    CHAT_TEMPERATURE: float = float(os.getenv("CHAT_TEMPERATURE", "0.7"))
    CHAT_MAX_TOKENS: int = int(os.getenv("CHAT_MAX_TOKENS", "1024"))
    
    # SQL服务模型（更精确的推理）
    SQL_MODEL: str = os.getenv("SQL_MODEL", "anthropic/claude-3-opus:free")
    SQL_TEMPERATURE: float = float(os.getenv("SQL_TEMPERATURE", "0.2"))
    SQL_MAX_TOKENS: int = int(os.getenv("SQL_MAX_TOKENS", "2048"))
    
    # 混合服务模型（复杂任务处理）
    HYBRID_MODEL: str = os.getenv("HYBRID_MODEL", "anthropic/claude-3-sonnet:free")
    HYBRID_TEMPERATURE: float = float(os.getenv("HYBRID_TEMPERATURE", "0.5"))
    HYBRID_MAX_TOKENS: int = int(os.getenv("HYBRID_MAX_TOKENS", "4096"))
    
    # 备用模型（当主模型不可用时使用）
    BACKUP_MODEL: str = os.getenv("BACKUP_MODEL", "openai/gpt-4-turbo:free")
    BACKUP_TEMPERATURE: float = float(os.getenv("BACKUP_TEMPERATURE", "0.7"))
    BACKUP_MAX_TOKENS: int = int(os.getenv("BACKUP_MAX_TOKENS", "2048"))
    
    # 全局模型配置
    MODEL_RETRY_COUNT: int = int(os.getenv("MODEL_RETRY_COUNT", "3"))
    MODEL_TIMEOUT: int = int(os.getenv("MODEL_TIMEOUT", "20"))
    MODEL_RETRY_INTERVAL: int = int(os.getenv("MODEL_RETRY_INTERVAL", "2"))
    
    # 应用设置
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    
    # 数据库连接字符串
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # CORS设置
    CORS_ORIGINS: list = ["*"]
    
    class Config:
        env_file = ".env"

# 创建全局设置实例
settings = Settings()

# 验证设置加载
logger.info(f"Settings SUPABASE_URL: {settings.SUPABASE_URL}")
logger.info(f"Settings SUPABASE_SERVICE_ROLE_KEY 是否存在: {bool(settings.SUPABASE_SERVICE_ROLE_KEY)}") 