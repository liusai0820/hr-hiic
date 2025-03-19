import os
from typing import Dict, Any
from pydantic import BaseModel, Field

class ModelConfig(BaseModel):
    """大模型配置类"""
    name: str = Field(..., description="模型名称")
    temperature: float = Field(0.7, description="模型温度")
    max_tokens: int = Field(1024, description="最大输出token数")
    retry_count: int = Field(3, description="重试次数")
    timeout: int = Field(20, description="超时时间(秒)")

class ModelManager:
    """大模型管理器"""
    
    def __init__(self):
        """初始化模型管理器"""
        # OpenRouter API配置
        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.api_url = os.getenv("OPENROUTER_API_URL", "https://openrouter.ai/api/v1/chat/completions")
        
        # 加载各场景模型配置
        self.classifier_model = self._load_model_config(
            "CLASSIFIER_MODEL",
            "google/gemma-3-7b-it:free",
            "CLASSIFIER_TEMPERATURE",
            "CLASSIFIER_MAX_TOKENS",
            0.1,  # 低温度，提高输出一致性
            10    # 问题分类只需要简短输出
        )
        
        self.chat_model = self._load_model_config(
            "CHAT_MODEL", 
            "google/gemma-3-27b-it:free",
            "CHAT_TEMPERATURE",
            "CHAT_MAX_TOKENS",
            0.7,  # 温度适中，平衡创造性和一致性
            1024  # 标准对话长度
        )
        
        self.sql_model = self._load_model_config(
            "SQL_MODEL", 
            "anthropic/claude-3-opus:free",
            "SQL_TEMPERATURE",
            "SQL_MAX_TOKENS",
            0.2,  # 低温度，增强精确性
            2048  # SQL查询需要更长上下文
        )
        
        self.hybrid_model = self._load_model_config(
            "HYBRID_MODEL", 
            "anthropic/claude-3-sonnet:free",
            "HYBRID_TEMPERATURE",
            "HYBRID_MAX_TOKENS",
            0.5,  # 平衡温度
            4096  # 混合处理需要最长上下文
        )
        
        # 备用模型配置
        self.backup_model = self._load_model_config(
            "BACKUP_MODEL", 
            "openai/gpt-4-turbo:free",
            "BACKUP_TEMPERATURE",
            "BACKUP_MAX_TOKENS",
            0.7,
            2048
        )
    
    def _load_model_config(self, 
                          model_name_env: str, 
                          default_model: str,
                          temp_env: str,
                          max_tokens_env: str,
                          default_temp: float,
                          default_max_tokens: int) -> ModelConfig:
        """从环境变量加载模型配置"""
        model_name = os.getenv(model_name_env, default_model)
        
        try:
            temperature = float(os.getenv(temp_env, str(default_temp)))
        except (ValueError, TypeError):
            temperature = default_temp
            
        try:
            max_tokens = int(os.getenv(max_tokens_env, str(default_max_tokens)))
        except (ValueError, TypeError):
            max_tokens = default_max_tokens
            
        return ModelConfig(
            name=model_name,
            temperature=temperature,
            max_tokens=max_tokens,
            retry_count=int(os.getenv("MODEL_RETRY_COUNT", "3")),
            timeout=int(os.getenv("MODEL_TIMEOUT", "20"))
        )
    
    def get_classifier_config(self) -> Dict[str, Any]:
        """获取问题分类器模型配置"""
        return {
            "model": self.classifier_model.name,
            "temperature": self.classifier_model.temperature,
            "max_tokens": self.classifier_model.max_tokens,
            "retry_count": self.classifier_model.retry_count,
            "timeout": self.classifier_model.timeout
        }
    
    def get_chat_config(self) -> Dict[str, Any]:
        """获取聊天模型配置"""
        return {
            "model": self.chat_model.name,
            "temperature": self.chat_model.temperature,
            "max_tokens": self.chat_model.max_tokens,
            "retry_count": self.chat_model.retry_count,
            "timeout": self.chat_model.timeout
        }
    
    def get_sql_config(self) -> Dict[str, Any]:
        """获取SQL模型配置"""
        return {
            "model": self.sql_model.name,
            "temperature": self.sql_model.temperature,
            "max_tokens": self.sql_model.max_tokens,
            "retry_count": self.sql_model.retry_count,
            "timeout": self.sql_model.timeout
        }
    
    def get_hybrid_config(self) -> Dict[str, Any]:
        """获取混合模型配置"""
        return {
            "model": self.hybrid_model.name,
            "temperature": self.hybrid_model.temperature,
            "max_tokens": self.hybrid_model.max_tokens,
            "retry_count": self.hybrid_model.retry_count,
            "timeout": self.hybrid_model.timeout
        }
    
    def get_backup_config(self) -> Dict[str, Any]:
        """获取备用模型配置"""
        return {
            "model": self.backup_model.name,
            "temperature": self.backup_model.temperature,
            "max_tokens": self.backup_model.max_tokens,
            "retry_count": self.backup_model.retry_count,
            "timeout": self.backup_model.timeout
        }
    
    def get_api_key(self) -> str:
        """获取API密钥"""
        return self.api_key
    
    def get_api_url(self) -> str:
        """获取API URL"""
        return self.api_url

# 创建全局模型管理器实例
model_manager = ModelManager() 