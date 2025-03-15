import json
import re
import asyncio
from typing import List, Dict, Any, Optional, Union
from app.services.tool_service import tool_service
from app.services.sql_service import sql_service
from app.services.openrouter_service import openrouter_service
from app.services.question_classifier import question_classifier
from app.db.supabase import supabase_client
from app.models.hr_models import ChatMessage

class HybridChatService:
    """混合聊天服务，整合工具调用和SQL查询功能"""
    
    def __init__(self):
        """初始化混合聊天服务"""
        # 创建系统提示
        self.system_prompt = self._create_system_prompt()
        # 创建工具调用提示
        self.tool_prompt = self._create_tool_prompt()
        # 响应缓存
        self.response_cache = {}
        # 最大缓存大小
        self.max_cache_size = 100
    
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
5. 如果需要进行复杂分析，你可以调用相应的工具函数或使用SQL查询
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
    
    def _generate_cache_key(self, question: str) -> str:
        """生成缓存键"""
        # 简单的规范化处理
        key = question.lower().strip()
        # 移除标点符号
        key = re.sub(r'[^\w\s]', '', key)
        # 移除多余空格
        key = re.sub(r'\s+', ' ', key)
        return key
    
    def _is_cacheable(self, question: str) -> bool:
        """判断问题是否可缓存"""
        # 包含特定名称的问题不缓存（可能是针对特定员工的查询）
        if re.search(r'(谁是|关于)\s*[^\s,，。？?!！]+', question):
            return False
        
        # 包含时间相关词汇的问题不缓存（可能是时效性查询）
        time_keywords = ["今天", "昨天", "本周", "上周", "本月", "上月", "最近"]
        if any(keyword in question for keyword in time_keywords):
            return False
        
        return True
    
    def _add_to_cache(self, question: str, response: str) -> None:
        """添加响应到缓存"""
        if not self._is_cacheable(question):
            return
        
        # 生成缓存键
        cache_key = self._generate_cache_key(question)
        
        # 如果缓存已满，移除最早的项
        if len(self.response_cache) >= self.max_cache_size:
            # 简单实现：直接清除一半缓存
            keys = list(self.response_cache.keys())
            for key in keys[:len(keys)//2]:
                self.response_cache.pop(key, None)
        
        # 添加到缓存
        self.response_cache[cache_key] = response
    
    def _check_cache(self, question: str) -> Optional[str]:
        """检查缓存中是否有匹配的响应"""
        cache_key = self._generate_cache_key(question)
        return self.response_cache.get(cache_key)
    
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
        
        # 1. 检查缓存
        cached_response = self._check_cache(user_message)
        if cached_response:
            print(f"混合聊天服务：使用缓存响应")
            return cached_response
        
        # 2. 分类问题，决定使用哪种方法
        approach = await question_classifier.classify(user_message)
        print(f"混合聊天服务：问题分类结果 - {approach}")
        
        # 3. 根据分类结果选择处理方法
        if approach.startswith("tool:"):
            # 使用工具方法
            tool_name = approach[5:]
            print(f"混合聊天服务：使用工具 {tool_name}")
            
            # 提取参数
            params = question_classifier.extract_parameters(user_message, tool_name)
            print(f"混合聊天服务：提取参数 - {params}")
            
            # 使用工具方法处理
            response = await self._process_with_tool(messages, tool_name, params)
        else:
            # 使用SQL方法
            print(f"混合聊天服务：使用SQL方法")
            response = await self._process_with_sql(user_message)
        
        # 4. 添加到缓存
        self._add_to_cache(user_message, response)
        
        return response
    
    async def _process_with_tool(self, messages: List[Union[ChatMessage, Dict[str, str]]], tool_name: str, params: Dict[str, Any]) -> str:
        """使用工具方法处理问题"""
        try:
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
            user_message = ""
            if messages and len(messages) > 0:
                last_message = messages[-1]
                if isinstance(last_message, dict):
                    user_message = last_message.get("content", "")
                else:  # 假设是ChatMessage对象
                    user_message = last_message.content
            
            full_messages.append({"role": "user", "content": user_message})
            
            # 构建工具调用消息
            tool_call = f"```tool_call\ntool: {tool_name}\n"
            for param_name, param_value in params.items():
                tool_call += f"param: {param_name}={param_value}\n"
            tool_call += "```"
            
            # 添加工具调用消息
            full_messages.append({"role": "assistant", "content": f"我需要使用工具来回答这个问题。\n\n{tool_call}"})
            
            # 执行工具调用
            tool_calls = [{"name": tool_name, "arguments": params}]
            tool_results = tool_service.execute_tool_calls(tool_calls)
            
            # 构建工具结果消息
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
            tool_result_message = "\n\n".join(result_parts)
            
            # 添加工具结果消息
            full_messages.append({"role": "system", "content": tool_result_message})
            
            # 生成最终回复
            final_response = openrouter_service.get_chat_response(full_messages)
            
            # 清理回复
            final_response = self._clean_response(final_response)
            return final_response
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"混合聊天服务：工具处理失败 - {str(e)}")
            print(f"错误详情: {error_trace}")
            
            # 如果工具处理失败，尝试使用SQL方法
            try:
                if isinstance(messages[-1], dict):
                    user_message = messages[-1].get("content", "")
                else:  # 假设是ChatMessage对象
                    user_message = messages[-1].content
                
                return await self._process_with_sql(user_message)
            except:
                return f"抱歉，处理您的请求时出现了问题。请稍后再试。"
    
    async def _process_with_sql(self, question: str) -> str:
        """使用SQL方法处理问题"""
        try:
            # 直接使用SQL服务处理
            return await sql_service.get_sql_response(question)
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"混合聊天服务：SQL处理失败 - {str(e)}")
            print(f"错误详情: {error_trace}")
            return f"抱歉，处理您的请求时出现了问题。请稍后再试。"
    
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

# 创建全局混合聊天服务实例
hybrid_chat_service = HybridChatService() 