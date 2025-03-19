"""
OpenRouter服务模块，提供与OpenRouter API的集成
"""

import json
import requests
import logging
import time
from typing import List, Dict, Any, Optional
from app.core.model_config import model_manager
from app.core.config import settings

# 设置日志记录器
logger = logging.getLogger(__name__)

class OpenRouterService:
    """OpenRouter服务类，提供与OpenRouter API的交互"""
    
    def __init__(self):
        """初始化OpenRouter服务"""
        self.api_key = model_manager.get_api_key()
        self.api_url = model_manager.get_api_url()
        
        # 检查API密钥是否已配置
        if not self.api_key:
            logger.warning("OpenRouter API密钥未配置，某些功能可能无法正常工作")
            
        # 设置API请求头
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://hiic-hr.app",
            "X-Title": "HIIC HR Assistant"
        }
        
        # 打印完整的headers，但隐藏完整的API密钥
        debug_headers = self.headers.copy()
        if "Authorization" in debug_headers and debug_headers["Authorization"]:
            auth_parts = debug_headers["Authorization"].split(" ")
            if len(auth_parts) > 1:
                token = auth_parts[1]
                if len(token) > 10:
                    debug_headers["Authorization"] = f"{auth_parts[0]} {token[:10]}..."
        logger.debug(f"OpenRouter API请求头: {debug_headers}")
    
    def chat_completion(self, messages: List[Dict[str, str]], model_type: str = "chat") -> Dict[str, Any]:
        """发送聊天请求到OpenRouter
        
        Args:
            messages: 消息列表
            model_type: 模型类型
            
        Returns:
            OpenRouter API响应
        """
        # 根据模型类型获取配置
        if model_type == "classifier":
            config = model_manager.get_classifier_config()
        elif model_type == "sql":
            config = model_manager.get_sql_config()
        elif model_type == "hybrid":
            config = model_manager.get_hybrid_config()
        else:
            config = model_manager.get_chat_config()
        
        # 记录模型和消息信息（调试用）
        logger.info(f"使用模型: {config['model']}")
        logger.info(f"消息数量: {len(messages)}")
        
        # 构建请求数据
        data = {
            "model": config["model"],
            "messages": messages,
            "temperature": config["temperature"]
        }
        
        # 如果设置了最大token数，添加到请求中
        if "max_tokens" in config and config["max_tokens"] > 0:
            data["max_tokens"] = config["max_tokens"]
        
        # 发送请求
        response = self._send_api_request(
            data, 
            retry_count=config["retry_count"],
            timeout=config["timeout"]
        )
            
        # 检查响应状态
        if response.status_code == 200:
            logger.info(f"OpenRouter API响应状态码: {response.status_code}")
            response_data = response.json()
            
            # 记录回复内容（调试用）
            content = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
            logger.info(f"收到OpenRouter回复: \n{content[:100]}...")
            
            return response_data
        else:
            error_message = f"OpenRouter API返回错误: 状态码 {response.status_code}, 响应: {response.text}"
            logger.error(error_message)
            raise Exception(error_message)
    
    def _send_api_request(self, data: Dict[str, Any], retry_count: int = 3, timeout: int = 30):
        """发送API请求，支持重试
        
        Args:
            data: 请求数据
            retry_count: 重试次数
            timeout: 超时时间（秒）
            
        Returns:
            API响应
        """
        # 获取配置的重试间隔，默认为2秒
        retry_interval = int(settings.MODEL_RETRY_INTERVAL) if hasattr(settings, 'MODEL_RETRY_INTERVAL') else 2
        
        last_exception = None
        for attempt in range(retry_count):
            try:
                # 记录请求开始时间
                start_time = time.time()
                logger.info(f"发送API请求，尝试 {attempt+1}/{retry_count}，超时设置: {timeout}秒")
                
                response = requests.post(
                    self.api_url,
                    headers=self.headers,
                    json=data,
                    timeout=timeout
                )
                
                # 记录请求耗时
                elapsed_time = time.time() - start_time
                logger.info(f"API请求耗时: {elapsed_time:.2f}秒")
                
                # 请求成功
                if response.status_code == 200:
                    logger.info(f"API请求成功，状态码: {response.status_code}")
                    return response
                
                # 请求失败但收到了响应
                error_message = f"API请求返回非200状态码: {response.status_code}, 响应: {response.text}"
                logger.error(error_message)
                
                # 对于特定的错误码，我们可能不需要重试
                if response.status_code == 400:  # 请求参数错误，重试也没用
                    logger.error("请求参数错误，不再重试")
                    return response
                
                # 服务器错误可能需要重试
                if attempt < retry_count - 1:
                    # 指数退避重试
                    sleep_time = retry_interval * (2 ** attempt)
                    logger.info(f"等待 {sleep_time} 秒后重试...")
                    time.sleep(sleep_time)
                
                last_exception = Exception(error_message)
            except requests.exceptions.Timeout as e:
                logger.error(f"API请求超时(尝试 {attempt+1}/{retry_count}): {str(e)}")
                last_exception = e
                if attempt < retry_count - 1:
                    # 超时情况下，可能需要更长的重试间隔
                    sleep_time = retry_interval * (2 ** attempt)
                    logger.info(f"请求超时，等待 {sleep_time} 秒后重试...")
                    time.sleep(sleep_time)
            except Exception as e:
                logger.error(f"API请求失败(尝试 {attempt+1}/{retry_count}): {str(e)}")
                last_exception = e
                if attempt < retry_count - 1:
                    # 指数退避重试
                    sleep_time = retry_interval * (2 ** attempt)
                    logger.info(f"等待 {sleep_time} 秒后重试...")
                    time.sleep(sleep_time)
        
        # 所有重试都失败
        if last_exception:
            logger.error(f"所有重试尝试都失败: {str(last_exception)}")
            raise last_exception
        
        # 不应该到达这里，但以防万一
        raise Exception("API请求失败，所有重试尝试都失败")
    
    async def get_chat_response(self, messages: List[Dict[str, str]], model_type: str = "chat") -> str:
        """获取聊天回复（仅返回文本内容）
        
        Args:
            messages: 消息列表
            model_type: 模型类型
            
        Returns:
            聊天回复内容
        """
        try:
            # 发送消息到OpenRouter
            if messages and messages[-1]["role"] == "user":
                logger.info(f"发送消息到OpenRouter: {messages[-1]['content'][:50]}...")
            
            # 打印发送的消息（调试用）
            logger.debug("发送到OpenRouter的消息:")
            for i, msg in enumerate(messages[:5]):  # 只打印前5条消息
                logger.debug(f"消息 {i + 1} - 角色: {msg['role']}, 内容前50个字符: {msg['content'][:50]}...")
            
            if len(messages) > 5:
                logger.debug(f"...还有 {len(messages) - 5} 条消息")
            
            import asyncio
            # 使用线程池来执行同步方法
            response = await asyncio.get_event_loop().run_in_executor(
                None, 
                lambda: self.chat_completion(messages, model_type=model_type)
            )
            return response["choices"][0]["message"]["content"]
        except Exception as e:
            error_message = f"获取聊天回复失败: {str(e)}"
            logger.error(error_message)
            return f"抱歉，处理您的请求时出现了问题。错误详情: {str(e)}"

# 创建全局OpenRouter服务实例
openrouter_service = OpenRouterService() 