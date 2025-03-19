from typing import List, Dict, Any, Optional
from app.services.openrouter_service import openrouter_service
from app.services.tool_service import HRToolService
from app.models.hr_models import ChatMessage
import json
import logging
import re

# 配置日志
logger = logging.getLogger(__name__)

class EnhancedHRChatService:
    """增强型HR聊天服务 - 支持工具调用"""
    
    def __init__(self):
        """初始化增强型聊天服务"""
        # 创建HR工具服务实例
        self.hr_tool_service = HRToolService()
        
        # 系统提示
        self.system_prompt = self._create_system_prompt()
        
        # 工具调用函数名映射
        self.tool_name_mapping = {
            "get_employee_by_name": "通过姓名查询员工",
            "get_employees_by_department": "查询部门所有员工",
            "get_birth_stats": "查询生日统计信息",
            "get_basic_stats": "获取基本统计信息",
            "analyze_department": "分析部门情况",
            "visualization": "数据可视化",
            "search_employee": "搜索员工"
        }
    
    def _create_system_prompt(self) -> str:
        """创建系统提示"""
        tools_description = self.hr_tool_service.get_tools_description()
        
        system_prompt = f"""你是HIIC公司内部HR系统的AI助手，名叫"Cool"。你的性格友好、专业且有亲和力。
你可以使用以下工具来回答用户的问题:

{tools_description}

工具使用指南：
1. 当用户提出与员工信息、部门数据、统计分析相关的问题时，请使用适当的工具获取准确信息
2. 使用工具时，需要提供函数名和参数，格式为 {{\"tool\": \"函数名\", \"parameters\": {{参数}}}}
3. 当不确定员工姓名的准确拼写时，使用search_employee工具先进行搜索
4. 对于可视化请求，使用visualization工具并指定适当的图表类型

回答格式要求：
1. 以自然、对话化的方式回答问题，避免直接罗列数据
2. 使用亲切友好的语气，像同事之间的对话一样自然
3. 所有回答必须使用中文，语气要活泼但专业
4. 如果用户问题无法通过工具回答，友好地说明无法找到相关信息

工具调用示例:
用户问题: "李明是哪个部门的？"
工具调用: {{\"tool\": \"get_employee_by_name\", \"parameters\": {{\"name\": \"李明\"}}}}

最重要的原则：只返回基于工具调用获得的真实信息，绝不编造数据。
"""
        return system_prompt
    
    async def get_response(self, messages: List[ChatMessage], preferred_tool: Optional[str] = None) -> str:
        """获取AI回复
        
        Args:
            messages: 消息历史
            preferred_tool: 首选工具（如可视化等）
            
        Returns:
            AI回复
        """
        try:
            # 提取用户最新的问题
            user_message = messages[-1].content if messages[-1].role == "user" else ""
            
            if not user_message:
                return "您好！有什么我可以帮您了解的吗？无论是查询员工信息还是部门情况，我都很乐意为您服务。"
            
            # 构建完整的消息列表
            full_messages = [
                {"role": "system", "content": self.system_prompt}
            ]
            
            # 添加历史消息（最多保留最近5条）
            history_messages = messages[:-1][-5:] if len(messages) > 1 else []
            for msg in history_messages:
                full_messages.append({"role": msg.role, "content": msg.content})
            
            # 如果有首选工具，添加工具提示
            if preferred_tool:
                tool_hint = f"用户问题可能与{self.tool_name_mapping.get(preferred_tool, preferred_tool)}有关，优先考虑使用相关工具。"
                full_messages.append({"role": "system", "content": tool_hint})
            
            # 添加用户最新消息
            full_messages.append({"role": "user", "content": user_message})
            
            # 调用OpenRouter API获取初始回复
            logger.info(f"发送消息到OpenRouter: {user_message[:50]}...")
            initial_response = await openrouter_service.get_chat_response(full_messages)
            
            # 检查响应中是否包含工具调用
            tool_call_match = re.search(r'{"tool":\s*"([^"]+)",\s*"parameters":\s*({[^}]+})}', initial_response, re.DOTALL)
            
            if tool_call_match:
                tool_name = tool_call_match.group(1)
                try:
                    parameters_str = tool_call_match.group(2)
                    parameters = json.loads(parameters_str)
                    
                    logger.info(f"检测到工具调用: {tool_name}")
                    logger.info(f"参数: {parameters}")
                    
                    # 执行工具调用
                    tool_result = await self.hr_tool_service.execute_tool(tool_name, parameters)
                    
                    # 发送工具结果，让AI生成最终回答
                    result_messages = full_messages.copy()
                    result_messages.append({"role": "assistant", "content": initial_response})
                    result_messages.append({"role": "system", "content": f"工具调用结果: {json.dumps(tool_result, ensure_ascii=False)}"})
                    result_messages.append({"role": "system", "content": "基于工具结果生成友好的回答，不要直接返回原始数据，而是将数据融入到自然的对话中。"})
                    
                    final_response = await openrouter_service.get_chat_response(result_messages)
                    return final_response
                    
                except Exception as e:
                    logger.error(f"执行工具调用时出错: {str(e)}")
                    return f"抱歉，在处理您的请求时遇到了一些问题。错误详情: {str(e)}"
            else:
                # 没有工具调用，直接返回初始回复
                return initial_response
                
        except Exception as e:
            logger.error(f"增强型聊天服务出错: {str(e)}")
            return f"抱歉，在处理您的请求时遇到了问题。错误详情: {str(e)}"

# 创建全局增强型HR聊天服务实例
enhanced_hr_chat_service = EnhancedHRChatService() 