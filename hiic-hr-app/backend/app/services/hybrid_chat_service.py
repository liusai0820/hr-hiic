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
import logging
from app.core.config import settings

# 配置日志
logger = logging.getLogger(__name__)

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
        system_prompt = """你是HIIC公司内部HR系统的AI助手，名叫"Cool"。你的性格友好、专业且有亲和力。你现在具有直接查询HR数据库的能力。

当回答HR相关问题时，请遵循以下原则：
1. 基于提供的SQL查询结果提供准确信息，不要编造不在结果中的数据
2. 以自然、对话化的方式表达查询结果，避免直接罗列数据
3. 使用亲切友好的语气，像同事之间的对话一样自然
4. 所有回答必须使用中文，语气要活泼但专业
5. 当查询结果为空时，礼貌地告知用户没有找到相关信息
6. 根据SQL查询的上下文解释数据含义

例如，如果SQL查询返回了某个部门有15名员工，不要只回复"15人"，而是回复"研发部目前有15名员工，是我们公司的主要技术力量。"之类更加对话化的表达。

记住，你的职责是使复杂的数据库查询结果变得易于理解和亲切。
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
    
    async def get_response(self, messages: List[ChatMessage]) -> str:
        """获取回复
        
        Args:
            messages: 消息列表
            
        Returns:
            回复内容
        """
        if not messages:
            return "请输入您的问题"
        
        # 获取最后一条用户消息
        user_message = messages[-1].content
        
        # 使用快速分类器进行分类
        try:
            question_type = await question_classifier.classify(user_message)
            logger.info(f"问题 '{user_message[:20]}...' 被分类为: {question_type}")
        except Exception as e:
            logger.error(f"问题分类失败: {str(e)}")
            question_type = "HYBRID_QUERY"  # 默认为混合查询
        
        # 根据问题类型选择处理方式
        try:
            if question_type == "SQL_QUERY":
                logger.info(f"尝试使用SQL服务处理问题: {user_message[:30]}...")
                # 使用SQL服务处理
                try:
                    # 设置更长的超时时间
                    timeout_seconds = settings.MODEL_TIMEOUT
                    logger.info(f"SQL查询超时设置为{timeout_seconds}秒")
                    
                    # 使用超时机制执行SQL查询
                    try:
                        # 创建一个任务
                        sql_task = asyncio.create_task(sql_service.get_sql_response(user_message))
                        # 等待任务完成，带超时
                        sql_response = await asyncio.wait_for(sql_task, timeout=timeout_seconds)
                        
                        # 清理响应中的所有Markdown格式和代码块
                        # 使用sql_service中相同的清理函数，保持一致性
                        sql_response = sql_service._clean_response(sql_response)
                        
                        return sql_response
                    except asyncio.TimeoutError:
                        logger.error(f"SQL查询超时，超过{timeout_seconds}秒")
                        # 尝试获取已查询到的结果（如果有）
                        if hasattr(sql_task, 'result') and sql_task.result() is not None:
                            logger.info("尽管超时，但SQL任务已完成，获取其结果")
                            sql_response = sql_task.result()
                            sql_response = sql_service._clean_response(sql_response)
                            return sql_response
                        else:
                            # 如果真的没有结果，回退到OpenRouter
                            logger.info("SQL查询真的超时了，回退到OpenRouter")
                            return await self._send_to_openrouter(messages)
                except Exception as e:
                    # SQL服务失败时才回退到OpenRouter
                    logger.error(f"SQL服务处理失败: {str(e)}")
                    logger.info("回退到OpenRouter处理SQL查询...")
                    return await self._send_to_openrouter(messages)
            
            elif question_type == "VISUALIZATION":
                # 未实现可视化，使用OpenRouter并给出提示
                logger.info("可视化功能暂未完整实现，使用OpenRouter回应")
                return await self._send_to_openrouter(messages)
            
            elif question_type == "DATA_ANALYSIS":
                # 未实现数据分析，使用OpenRouter并给出提示
                logger.info("数据分析功能暂未完整实现，使用OpenRouter回应")
                return await self._send_to_openrouter(messages)
            
            elif question_type == "HYBRID_QUERY":
                # 使用工具服务检查是否有工具可用
                tool_result = await tool_service.process_tool_call(user_message)
                if tool_result:
                    logger.info(f"使用工具服务处理: {tool_result[:30]}...")
                    return tool_result
                
                # 无工具可用，使用OpenRouter
                logger.info("没有适用的工具，使用OpenRouter回应")
                return await self._send_to_openrouter(messages)
            
            else:  # GENERAL_QUERY
                # 一般问题直接使用OpenRouter
                logger.info("一般问题，直接使用OpenRouter回应")
                
                # 对于可能是部门负责人查询但被错误分类的问题进行特殊处理
                dept_head_pattern = r'(谁是|谁担任|谁负责|谁主管|谁分管)(.*?)(负责人|部长|所长|主任|主管|的)'
                if re.search(dept_head_pattern, user_message):
                    logger.info("检测到可能是部门负责人查询的问题，尝试使用SQL服务处理")
                    try:
                        # 尝试用SQL服务处理
                        sql_response = await sql_service.get_sql_response(user_message)
                        return sql_response
                    except Exception as e:
                        logger.error(f"SQL服务处理部门负责人查询失败: {str(e)}")
                        # 失败时回退到OpenRouter
                
                # 尝试检测是否包含部门名称
                dept_patterns = [
                    r'(大数据平台与信息部|数字经济研究所|生物经济研究所|海洋经济研究所|城市轨道与城市发展研究所|创新中心|党委办公室|合规管理部|综合协同部|战略发展与项目管理部)',
                    r'(\w+部|\w+所|\w+中心)'
                ]
                
                contains_dept = False
                for pattern in dept_patterns:
                    if re.search(pattern, user_message):
                        contains_dept = True
                        break
                
                if contains_dept:
                    logger.info("检测到问题中包含部门名称，尝试使用SQL服务处理")
                    try:
                        # 尝试用SQL服务处理
                        sql_response = await sql_service.get_sql_response(user_message)
                        return sql_response
                    except Exception as e:
                        logger.error(f"SQL服务处理部门相关查询失败: {str(e)}")
                        # 失败时回退到OpenRouter
                
                return await self._send_to_openrouter(messages)
                
        except Exception as e:
            logger.error(f"混合聊天服务出错: {str(e)}")
            # 出错时使用OpenRouter回退
            try:
                return await self._send_to_openrouter(messages)
            except Exception as nested_e:
                logger.error(f"OpenRouter回退也失败: {str(nested_e)}")
                return "抱歉，处理您的请求时出现了问题。请稍后再试。"
    
    async def _send_to_openrouter(self, messages: List[ChatMessage]) -> str:
        """发送消息到OpenRouter
        
        Args:
            messages: 消息列表
            
        Returns:
            OpenRouter回复
        """
        # 转换消息格式
        formatted_messages = [
            {"role": "system", "content": self.system_prompt}
        ]
        
        # 添加用户消息，最多添加最近的10条
        for msg in messages[-10:]:
            formatted_messages.append({
                "role": "user" if msg.role == "user" else "assistant", 
                "content": msg.content
            })
        
        # 发送到OpenRouter，使用hybrid模型
        logger.info("发送消息到OpenRouter...")
        response = await openrouter_service.get_chat_response(formatted_messages, model_type="hybrid")
        logger.info(f"收到OpenRouter回复: {response[:50]}...")
        
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
            final_response = await openrouter_service.get_chat_response(full_messages)
            
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