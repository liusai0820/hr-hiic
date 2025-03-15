import json
import re
from typing import List, Dict, Any, Optional, Union
from app.services.tool_service import tool_service
from app.services.openrouter_service import openrouter_service
from app.db.supabase import supabase_client
from app.models.hr_models import ChatMessage  # 导入ChatMessage模型

class EnhancedHRChatService:
    """增强版HR聊天服务，支持工具调用和复杂推理"""
    
    def __init__(self):
        """初始化增强版聊天服务"""
        # 创建系统提示
        self.system_prompt = self._create_system_prompt()
        # 创建工具调用提示
        self.tool_prompt = self._create_tool_prompt()
    
    def _create_system_prompt(self) -> str:
        """创建系统提示"""
        # 获取基本统计信息
        dept_stats = supabase_client.get_department_stats()
        gender_stats = supabase_client.get_gender_stats()
        age_stats = supabase_client.get_age_stats()
        education_stats = supabase_client.get_education_stats()
        
        # 构建系统提示
        system_prompt = f"""你是HIIC公司内部HR系统的AI助手，名叫"小智"。你的性格友好、专业且有亲和力。你的回答必须基于我提供的员工数据库信息。

公司员工数据概况:
- 总员工数: {dept_stats.get('total_employees', '未知') if dept_stats else '未知'}
- 部门数量: {len(dept_stats) if dept_stats else '未知'}
- 性别分布: {json.dumps(gender_stats, ensure_ascii=False) if gender_stats else '未知'}
- 平均年龄: {age_stats.get('mean', '未知') if age_stats else '未知'}

你现在拥有强大的数据分析能力，可以回答复杂的HR相关问题。你可以：
1. 分析部门结构和人员配置
2. 计算和比较各种HR指标
3. 进行员工数据的统计分析
4. 回答需要推理和计算的复杂问题

重要指示:
1. 你的回答必须严格基于数据，绝对不要编造不在数据中的信息
2. 以自然、对话化的方式回答问题，避免直接罗列数据，而是将数据融入到对话中
3. 使用亲切友好的语气，像同事之间的对话一样自然
4. 所有回答必须使用中文，语气要活泼但专业
5. 如果需要进行复杂分析，你可以调用相应的工具函数
6. 当用户询问员工信息时，不要生硬地罗列数据，而是以自然的语言描述
7. 特别注意：不要编造员工的学历、毕业院校或其他背景信息，只描述确切数据
8. 如果数据中某个字段是空的或未知的，直接说明该信息未知，不要猜测或编造

请记住，你是在与人对话，而不是简单地展示数据。但更重要的是，你必须保证信息的准确性，宁可少说也不要编造。
"""
        return system_prompt
    
    def _create_tool_prompt(self) -> str:
        """创建工具调用提示"""
        # 获取所有工具的描述
        tool_descriptions = tool_service.get_tool_descriptions()
        
        # 格式化工具描述
        formatted_tools = []
        for tool in tool_descriptions:
            params_desc = []
            for param in tool.get("parameters", []):
                required = "必需" if param.get("required", False) else "可选"
                params_desc.append(f"- {param.get('name')}: {param.get('type')} ({required})")
            
            formatted_tools.append(f"""工具名称: {tool.get('name')}
描述: {tool.get('description')}
参数:
{chr(10).join(params_desc)}
""")
        
        # 构建工具调用提示
        tool_prompt = f"""你现在可以使用以下工具来帮助回答用户的问题：

{chr(10).join(formatted_tools)}

如何使用工具：
1. 分析用户的问题，确定需要使用哪个工具
2. 如果问题需要使用工具来回答，请使用以下格式调用工具：

```tool_call
tool: 工具名称
param: 参数名=参数值
param: 参数名=参数值
...
```

3. 你可以在一次回复中调用多个工具，每个工具调用使用单独的```tool_call```代码块
4. 调用工具后，我会执行工具并返回结果，然后你可以基于结果回答用户的问题
5. 如果问题不需要使用工具，直接回答即可

示例：
用户问题: "研发部有多少人？"
工具调用:
```tool_call
tool: analyze_department
param: department=研发部
```

用户问题: "公司的平均年龄是多少？"
工具调用:
```tool_call
tool: analyze_age_distribution
```

记住，只有在需要时才调用工具，不要滥用工具调用。如果你已经知道答案或者问题很简单，直接回答即可。
"""
        return tool_prompt
    
    async def get_response(self, messages: List[Union[ChatMessage, Dict[str, str]]]) -> str:
        """获取AI回复"""
        # 提取用户最新的问题，兼容ChatMessage对象和字典
        user_message = ""
        if messages and len(messages) > 0:
            last_message = messages[-1]
            if isinstance(last_message, dict):
                user_message = last_message.get("content", "") if last_message.get("role") == "user" else ""
            else:  # 假设是ChatMessage对象
                user_message = last_message.content if last_message.role == "user" else ""
        
        if not user_message:
            return "您好！有什么我可以帮您了解的吗？无论是查询员工信息还是部门情况，我都很乐意为您服务。"
        
        # 构建完整的消息列表
        full_messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "system", "content": self.tool_prompt}
        ]
        
        # 添加历史消息（最多保留最近5条），兼容ChatMessage对象和字典
        history_messages = messages[:-1][-5:] if len(messages) > 1 else []
        for msg in history_messages:
            if isinstance(msg, dict):
                full_messages.append({"role": msg.get("role", ""), "content": msg.get("content", "")})
            else:  # 假设是ChatMessage对象
                full_messages.append({"role": msg.role, "content": msg.content})
        
        # 添加当前用户消息
        full_messages.append({"role": "user", "content": user_message})
        
        try:
            # 调用OpenRouter API获取初始回复
            print(f"发送消息到OpenRouter: {user_message}")
            initial_response = openrouter_service.get_chat_response(full_messages)
            print(f"收到OpenRouter初始回复: {initial_response[:100]}...")
            
            # 检查回复中是否包含工具调用
            tool_calls = self._extract_tool_calls(initial_response)
            
            if tool_calls:
                print(f"检测到工具调用: {json.dumps(tool_calls, ensure_ascii=False)}")
                
                # 执行工具调用
                tool_results = tool_service.execute_tool_calls(tool_calls)
                print(f"工具调用结果: {json.dumps(tool_results, ensure_ascii=False)[:200]}...")
                
                # 构建包含工具结果的新消息
                tool_result_message = self._format_tool_results(tool_calls, tool_results)
                
                # 添加工具调用和结果到消息列表
                full_messages.append({"role": "assistant", "content": initial_response})
                full_messages.append({"role": "system", "content": tool_result_message})
                
                # 再次调用OpenRouter API获取最终回复
                print("发送工具结果到OpenRouter...")
                final_response = openrouter_service.get_chat_response(full_messages)
                print(f"收到OpenRouter最终回复: {final_response[:100]}...")
                
                # 清理最终回复中的工具调用格式
                final_response = self._clean_response(final_response)
                return final_response
            else:
                # 如果没有工具调用，直接返回初始回复
                return self._clean_response(initial_response)
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"获取AI回复失败: {str(e)}")
            print(f"错误详情: {error_trace}")
            return f"抱歉，处理您的请求时出现了问题。请稍后再试。"
    
    def _extract_tool_calls(self, response: str) -> List[Dict[str, Any]]:
        """从回复中提取工具调用"""
        # 使用正则表达式匹配```tool_call```代码块
        pattern = r"```tool_call\n(.*?)\n```"
        matches = re.findall(pattern, response, re.DOTALL)
        
        if not matches:
            return []
        
        # 解析工具调用
        all_calls = []
        for match in matches:
            calls = tool_service.parse_tool_calls(match)
            all_calls.extend(calls)
        
        return all_calls
    
    def _format_tool_results(self, tool_calls: List[Dict[str, Any]], tool_results: List[Dict[str, Any]]) -> str:
        """格式化工具调用结果"""
        result_parts = ["以下是工具调用的结果："]
        
        for i, (call, result) in enumerate(zip(tool_calls, tool_results)):
            tool_name = call.get("name", "未知工具")
            args = call.get("arguments", {})
            args_str = ", ".join([f"{k}={v}" for k, v in args.items()])
            
            result_data = result.get("result", {})
            result_json = json.dumps(result_data, ensure_ascii=False, indent=2)
            
            result_parts.append(f"工具调用 {i+1}: {tool_name}({args_str})")
            result_parts.append(f"结果:\n{result_json}")
        
        result_parts.append("\n请根据以上工具调用结果，回答用户的问题。记住，以自然、对话化的方式回答，不要直接展示原始数据。")
        
        return "\n\n".join(result_parts)
    
    def _clean_response(self, response: str) -> str:
        """清理回复中的工具调用格式"""
        # 移除```tool_call```代码块
        response = re.sub(r"```tool_call\n.*?\n```", "", response, flags=re.DOTALL)
        
        # 移除可能的工具调用指令
        response = re.sub(r"我需要使用工具来回答这个问题。", "", response)
        response = re.sub(r"让我使用工具来回答这个问题。", "", response)
        
        # 移除多余的空行
        response = re.sub(r"\n{3,}", "\n\n", response)
        
        return response.strip()

# 创建全局增强版聊天服务实例
enhanced_hr_chat_service = EnhancedHRChatService() 