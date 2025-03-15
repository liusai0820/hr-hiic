"""
OpenRouter服务模块，提供与OpenRouter API的集成
"""

import json
import requests
from typing import List, Dict, Any, Optional
from app.core.config import settings

class OpenRouterService:
    """OpenRouter服务类，提供与OpenRouter API的交互"""
    
    def __init__(
        self, 
        api_key: str = settings.OPENROUTER_API_KEY,
        model: str = settings.OPENROUTER_MODEL,
        api_url: str = settings.OPENROUTER_API_URL
    ):
        """初始化OpenRouter服务
        
        Args:
            api_key: OpenRouter API密钥
            model: 使用的模型名称
            api_url: OpenRouter API URL
        """
        self.api_key = api_key
        self.model = model
        self.api_url = api_url
        
        # 打印API密钥前几个字符，用于调试
        if self.api_key:
            print(f"OpenRouter API密钥前10个字符: {self.api_key[:10]}...")
        else:
            print("警告: OpenRouter API密钥为空")
        
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://hiic-hr.app",  # 您的应用URL
            "X-Title": "HIIC HR AI App"  # 修改为英文，避免编码问题
        }
        
        # 打印完整的headers，但隐藏完整的API密钥
        debug_headers = self.headers.copy()
        if "Authorization" in debug_headers and debug_headers["Authorization"]:
            auth_parts = debug_headers["Authorization"].split(" ")
            if len(auth_parts) > 1:
                token = auth_parts[1]
                if len(token) > 10:
                    debug_headers["Authorization"] = f"{auth_parts[0]} {token[:10]}..."
        print(f"OpenRouter API请求头: {debug_headers}")
    
    def chat_completion(
        self, 
        messages: List[Dict[str, str]],
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Dict[str, Any]:
        """调用OpenRouter聊天完成API
        
        Args:
            messages: 消息列表，格式为[{"role": "user", "content": "Hello"}, ...]
            temperature: 温度参数，控制随机性
            max_tokens: 最大生成的token数
            stream: 是否使用流式响应
            
        Returns:
            API响应的JSON对象
        """
        url = f"{self.api_url}/chat/completions"
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream
        }
        
        if max_tokens:
            payload["max_tokens"] = max_tokens
        
        try:
            print(f"发送请求到OpenRouter API: {url}")
            print(f"使用模型: {self.model}")
            print(f"消息数量: {len(messages)}")
            
            # 再次检查API密钥
            if not self.api_key or len(self.api_key) < 10:
                print("错误: OpenRouter API密钥无效或为空")
                raise ValueError("OpenRouter API密钥无效或为空")
            
            # 确保headers中包含Authorization
            if "Authorization" not in self.headers or not self.headers["Authorization"]:
                print("错误: Authorization头部缺失")
                self.headers["Authorization"] = f"Bearer {self.api_key}"
                print(f"已重新设置Authorization头部: Bearer {self.api_key[:10]}...")
            
            response = requests.post(
                url, 
                headers=self.headers, 
                json=payload,  # 使用json参数自动处理编码
            )
            
            print(f"OpenRouter API响应状态码: {response.status_code}")
            
            if response.status_code != 200:
                print(f"OpenRouter API错误响应: {response.text}")
                
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"OpenRouter API调用失败: {str(e)}")
            if hasattr(e, 'response') and e.response:
                print(f"响应状态码: {e.response.status_code}")
                print(f"响应内容: {e.response.text}")
            raise
    
    def get_chat_response(self, messages: List[Dict[str, str]]) -> str:
        """获取聊天回复的文本内容
        
        Args:
            messages: 消息列表
            
        Returns:
            模型生成的回复文本
        """
        try:
            # 打印消息内容，用于调试
            print("发送到OpenRouter的消息:")
            for i, msg in enumerate(messages):
                print(f"消息 {i+1} - 角色: {msg['role']}, 内容前50个字符: {msg['content'][:50]}...")
            
            # 确保所有消息内容都是字符串
            sanitized_messages = []
            for msg in messages:
                sanitized_msg = {
                    "role": str(msg["role"]),
                    "content": str(msg["content"])
                }
                sanitized_messages.append(sanitized_msg)
            
            response = self.chat_completion(sanitized_messages)
            if 'choices' in response and len(response['choices']) > 0:
                return response['choices'][0]['message']['content']
            else:
                print(f"OpenRouter返回的响应缺少choices字段: {response}")
                return "抱歉，无法获取有效回复。"
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"获取聊天回复失败: {str(e)}")
            print(f"错误详情: {error_trace}")
            return f"抱歉，处理您的请求时出现了问题。请稍后再试。"

# 创建全局OpenRouter服务实例
openrouter_service = OpenRouterService() 