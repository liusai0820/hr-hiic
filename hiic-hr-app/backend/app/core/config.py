import os
from pydantic import BaseModel
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class Settings(BaseModel):
    """应用配置设置"""
    APP_NAME: str = "HIIC HR AI应用"
    APP_VERSION: str = "0.1.0"
    APP_DESCRIPTION: str = "基于HR数据的AI对话和分析应用"
    
    # Supabase配置
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_TABLE: str = os.getenv("SUPABASE_TABLE", "hr_data")
    
    # OpenRouter配置
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-exp:free")
    OPENROUTER_API_URL: str = os.getenv("OPENROUTER_API_URL", "https://openrouter.ai/api/v1")
    
    # 应用设置
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # 数据库连接字符串
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # CORS设置
    CORS_ORIGINS: list = ["*"]
    
    class Config:
        env_file = ".env"

# 创建全局设置实例
settings = Settings() 