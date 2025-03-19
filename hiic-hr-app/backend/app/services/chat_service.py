from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from app.core.config import settings
from app.db.supabase import supabase_client
from app.services.openrouter_service import openrouter_service
from app.models.hr_models import ChatMessage
import pandas as pd
import json
from typing import List, Dict, Any
import numpy as np

class HRChatService:
    """HR聊天服务"""
    
    def __init__(self):
        """初始化聊天服务"""
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        
        # 加载HR数据
        self.hr_data = self._load_hr_data()
        
        # 创建系统提示
        self.system_prompt = self._create_system_prompt()
    
    def _load_hr_data(self) -> pd.DataFrame:
        """加载HR数据"""
        try:
            return supabase_client.get_employees_as_dataframe()
        except Exception as e:
            print(f"加载HR数据失败: {str(e)}")
            return pd.DataFrame()
    
    def _create_system_prompt(self) -> str:
        """创建系统提示"""
        # 获取基本统计信息
        dept_stats = supabase_client.get_department_stats()
        gender_stats = supabase_client.get_gender_stats()
        age_stats = supabase_client.get_age_stats()
        education_stats = supabase_client.get_education_stats()
        
        # 构建系统提示
        system_prompt = f"""你是HIIC公司内部HR系统的AI助手，名叫"Cool"。你的性格友好、专业且有亲和力。你的回答必须基于我提供的员工数据库信息。

公司员工数据概况:
- 总员工数: {len(self.hr_data) if not self.hr_data.empty else '未知'}
- 部门数量: {len(dept_stats) if dept_stats else '未知'}
- 性别分布: {json.dumps(gender_stats, ensure_ascii=False) if gender_stats else '未知'}
- 平均年龄: {age_stats.get('mean', '未知') if age_stats else '未知'}

重要指示:
1. 你的回答必须严格基于我提供的数据，绝对不要编造不在数据中的信息
2. 以自然、对话化的方式回答问题，避免直接罗列数据，而是将数据融入到对话中，不要突出学校985、211、C9等字样
3. 使用亲切友好的语气，像同事之间的对话一样自然
4. 所有回答必须使用中文，语气要活泼但专业
5. 如果我没有提供相关数据，友好地说明无法找到相关信息
6. 当用户询问员工信息时，不要生硬地罗列数据，而是以自然的语言描述这个人
7. 特别注意：不要编造员工的学历、毕业院校或其他背景信息，只描述我提供给你的确切数据
8. 如果数据中某个字段是空的或未知的，直接说明该信息未知，不要猜测或编造

例如，不要这样回答:
"姓名: 张三
性别: 男
年龄: 35岁
部门: 研发部"

而是这样回答:
"张三是我们研发部的一位35岁的男同事。他..."

请记住，你是在与人对话，而不是简单地展示数据。但更重要的是，你必须保证信息的准确性，宁可少说也不要编造。
"""
        return system_prompt
    
    async def get_response(self, messages: List[ChatMessage]) -> str:
        """获取AI回复"""
        # 提取用户最新的问题
        user_message = messages[-1].content if messages[-1].role == "user" else ""
        
        if not user_message:
            return "您好！有什么我可以帮您了解的吗？无论是查询员工信息还是部门情况，我都很乐意为您服务。"
        
        # 尝试从数据库中查找相关信息
        relevant_data = self._search_relevant_data(user_message)
        
        # 构建完整的消息列表
        full_messages = [
            {"role": "system", "content": self.system_prompt},
        ]
        
        # 如果找到相关数据，添加到系统提示中
        if relevant_data:
            data_context = f"""以下是与用户问题相关的员工数据:

{relevant_data}

请不要直接复制粘贴这些数据，而是以自然、对话化的方式回答用户问题。将这些数据融入到你的回答中，使回答听起来像是一个人在说话，而不是机器在读取数据。保持友好、专业的语气，就像你是用户的HR同事一样。

重要提醒：
1. 只使用我提供的数据回答问题，不要编造任何不在数据中的信息
2. 如果数据中某些字段是空的或未知的，直接说明该信息未知，不要猜测或编造
3. 特别是关于员工的学历、毕业院校或工作背景，必须严格基于提供的数据
4. 宁可信息不完整，也不要提供虚假信息"""
            full_messages.append({"role": "system", "content": data_context})
        else:
            # 如果没有找到相关数据，明确告知LLM
            full_messages.append({"role": "system", "content": "我没有找到与用户问题相关的员工数据。请友好地告知用户无法找到相关信息，并询问是否可以提供其他帮助。不要编造任何回答。"})
        
        # 添加历史消息（最多保留最近5条）
        history_messages = messages[:-1][-5:] if len(messages) > 1 else []
        full_messages.extend([{"role": msg.role, "content": msg.content} for msg in history_messages])
        
        # 添加当前用户消息
        full_messages.append({"role": "user", "content": user_message})
        
        try:
            # 调用OpenRouter API
            print(f"发送消息到OpenRouter: {user_message}")
            response = await openrouter_service.get_chat_response(full_messages)
            print(f"收到OpenRouter回复: {response[:100]}...")
            return response
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"获取AI回复失败: {str(e)}")
            print(f"错误详情: {error_trace}")
            return f"抱歉，处理您的请求时出现了问题。请稍后再试。"
    
    async def get_sql_response(self, question: str) -> str:
        """获取基于SQL的回复"""
        # 这里可以实现SQL生成和执行逻辑
        # 目前先返回一个简单的回复
        return f"您的问题'{question}'需要查询数据库，该功能正在开发中。"
    
    def _search_relevant_data(self, query: str) -> str:
        """从数据库中搜索与查询相关的数据"""
        if self.hr_data.empty:
            return ""
            
        # 简单的关键词匹配
        result = ""
        
        # 检查是否是查询特定员工
        employee_names = []
        for _, employee in self.hr_data.iterrows():
            # 如果员工姓名在查询中
            if 'name' in employee and str(employee['name']) in query:
                employee_names.append(str(employee['name']))
        
        # 如果找到了员工姓名
        if employee_names:
            # 如果只有一个员工姓名匹配
            if len(employee_names) == 1:
                employee_name = employee_names[0]
                employee = self.hr_data[self.hr_data['name'] == employee_name].iloc[0]
                # 格式化员工信息，避免直接使用to_string()
                formatted_info = self._format_employee_info(employee)
                return formatted_info
            # 如果有多个员工姓名匹配，返回所有匹配的员工信息
            else:
                results = []
                results.append(f"找到{len(employee_names)}名匹配的员工:")
                for name in employee_names:
                    employee = self.hr_data[self.hr_data['name'] == name].iloc[0]
                    dept = employee.get('department', '未知')
                    pos = employee.get('position', '未知')
                    major = employee.get('major', '未知')
                    results.append(f"- {name}, 部门: {dept}, 职位: {pos}, 专业: {major}")
                return "\n".join(results)
                
        # 检查是否是查询特定部门
        if '部门' in query or '部' in query:
            for dept in self.hr_data['department'].unique():
                if dept in query:
                    dept_employees = self.hr_data[self.hr_data['department'] == dept]
                    # 格式化部门员工信息
                    formatted_dept_info = f"{dept}部门有{len(dept_employees)}名员工。\n"
                    formatted_dept_info += "部门员工列表:\n"
                    for i, (_, emp) in enumerate(dept_employees.head().iterrows(), 1):
                        formatted_dept_info += f"{i}. {emp.get('name', '未知')}, 职位: {emp.get('position', '未知')}\n"
                    return formatted_dept_info
        
        # 检查是否是查询特定专业的员工
        if '专业' in query or '学' in query:
            # 提取可能的专业名称
            potential_majors = []
            
            # 检查常见专业名称
            common_majors = ['金融', '计算机', '软件', '电子', '通信', '机械', '土木', '建筑', 
                            '经济', '管理', '会计', '法律', '医学', '生物', '化学', '物理', 
                            '数学', '英语', '中文', '历史', '哲学', '艺术', '音乐', '体育',
                            '数据科学', '人工智能', '机器学习', '大数据', '环境', '资源与环境']
            
            # 专业别名映射，处理同一专业的不同表达方式
            major_aliases = {
                '环境': ['环境', '资源与环境', '环境工程', '环境科学', '环境保护', '环境管理'],
                '机械': ['机械', '机械工程', '机械设计', '机械制造'],
                '计算机': ['计算机', '软件', '计算机科学', '信息技术', 'IT', '软件工程'],
                '金融': ['金融', '金融学', '财务', '财务管理', '金融管理']
            }
            
            # 首先检查是否有直接匹配的专业名称
            for major in common_majors:
                if major in query:
                    # 如果有别名映射，使用所有别名进行查询
                    if major in major_aliases:
                        potential_majors.extend(major_aliases[major])
                    else:
                        potential_majors.append(major)
            
            # 检查是否同时查询特定员工和专业
            employee_name = None
            for _, employee in self.hr_data.iterrows():
                if 'name' in employee and str(employee['name']) in query:
                    employee_name = str(employee['name'])
                    break
            
            # 如果同时查询特定员工和专业
            if employee_name and potential_majors:
                employee = self.hr_data[self.hr_data['name'] == employee_name].iloc[0]
                major = employee.get('major', '未知')
                
                # 检查该员工是否是查询的专业
                is_queried_major = False
                for potential_major in potential_majors:
                    if major and potential_major in major:
                        is_queried_major = True
                        break
                
                result = f"员工 {employee_name} 的专业是 {major}。"
                if is_queried_major:
                    result += f"\n是的，{employee_name} 是{potential_majors[0]}专业的。"
                else:
                    result += f"\n不，{employee_name} 不是{potential_majors[0]}专业的。"
                
                return result
            
            # 如果找到了可能的专业
            if potential_majors:
                major_results = []
                all_matched_employees = pd.DataFrame()
                
                for major in potential_majors:
                    # 查找该专业的员工，使用更宽松的匹配方式
                    try:
                        # 使用正则表达式进行部分匹配，处理可能的专业名称变体
                        pattern = f".*{major}.*"
                        major_employees = self.hr_data[self.hr_data['major'].str.contains(pattern, regex=True, na=False)]
                        
                        # 合并结果，避免重复
                        if not major_employees.empty and all_matched_employees.empty:
                            all_matched_employees = major_employees
                        elif not major_employees.empty:
                            all_matched_employees = pd.concat([all_matched_employees, major_employees]).drop_duplicates()
                    except Exception as e:
                        print(f"查询专业'{major}'时出错: {str(e)}")
                        continue
                
                # 使用合并后的结果
                if not all_matched_employees.empty:
                    count = len(all_matched_employees)
                    # 使用查询中的专业名称作为显示名称
                    display_major = next((m for m in common_majors if m in query), potential_majors[0])
                    major_results.append(f"公司共有{count}名{display_major}专业的员工。")
                    
                    # 添加部门分布信息
                    dept_counts = all_matched_employees['department'].value_counts().head(5)
                    if not dept_counts.empty:
                        major_results.append(f"{display_major}专业员工的部门分布(前5):")
                        for dept, count in dept_counts.items():
                            major_results.append(f"- {dept}: {count}人")
                    
                    # 添加学历分布信息
                    edu_counts = all_matched_employees['education'].value_counts()
                    if not edu_counts.empty:
                        major_results.append(f"{display_major}专业员工的学历分布:")
                        for edu, count in edu_counts.items():
                            major_results.append(f"- {edu}: {count}人")
                    
                    # 列出部分员工信息
                    major_results.append(f"{display_major}专业的部分员工:")
                    for i, (_, emp) in enumerate(all_matched_employees.head(5).iterrows(), 1):
                        name = emp.get('name', '未知')
                        dept = emp.get('department', '未知')
                        pos = emp.get('position', '未知')
                        edu = emp.get('education', '未知')
                        univ = emp.get('university', '未知')
                        major_actual = emp.get('major', '未知')
                        # 提供更完整的员工信息，避免大模型产生幻觉
                        major_results.append(f"{i}. {name}, 部门: {dept}, 职位: {pos}, 学历: {edu}, 毕业院校: {univ}, 专业: {major_actual}")
                
                if major_results:
                    return "\n".join(major_results)
        
        # 其他类型的查询可以继续添加...
        
        return result
        
    def _format_employee_info(self, employee) -> str:
        """格式化员工信息，避免直接使用to_string()"""
        # 提取关键字段并格式化
        info = []
        
        # 安全获取字段函数
        def safe_get_field(field_name):
            """安全获取字段值，处理可能的数组和NA值"""
            if field_name not in employee:
                return None
                
            value = employee[field_name]
            
            # 检查是否为数组类型
            if isinstance(value, (list, np.ndarray)):
                # 如果是数组，检查是否所有元素都是NA
                if all(pd.isna(item) for item in value):
                    return None
                # 否则，将非NA元素连接成字符串
                return ', '.join(str(item) for item in value if pd.notna(item))
            
            # 如果是单个值，检查是否为NA
            if pd.isna(value):
                return None
                
            return value
        
        # 基本信息
        name = safe_get_field('name')
        if name:
            info.append(f"姓名: {name}")
            
        gender = safe_get_field('gender')
        if gender:
            info.append(f"性别: {gender}")
            
        birth_date = safe_get_field('birth_date')
        if birth_date:
            info.append(f"出生日期: {birth_date}")
            
        age = safe_get_field('age')
        if age:
            info.append(f"年龄: {int(float(age))}岁")
            
        # 部门和职位
        department = safe_get_field('department')
        if department:
            info.append(f"部门: {department}")
            
        position = safe_get_field('position')
        if position:
            info.append(f"职位: {position}")
            
        # 学历信息
        university = safe_get_field('university')
        if university:
            info.append(f"毕业院校: {university}")
            
        major = safe_get_field('major')
        if major:
            info.append(f"专业: {major}")
            
        education = safe_get_field('education')
        if education:
            info.append(f"学历: {education}")
            
        degree = safe_get_field('degree')
        if degree:
            info.append(f"学位: {degree}")
            
        # 工作信息
        hire_date = safe_get_field('hire_date')
        if hire_date:
            info.append(f"入职日期: {hire_date}")
            
        company_years = safe_get_field('company_years')
        if company_years:
            info.append(f"在职年限: {company_years}年")
            
        total_work_years = safe_get_field('total_work_years')
        if total_work_years:
            info.append(f"总工作年限: {total_work_years}年")
            
        # 职称和晋升
        title = safe_get_field('title')
        if title:
            info.append(f"职称: {title}")
            
        title_date = safe_get_field('title_date')
        if title_date:
            info.append(f"职称获得日期: {title_date}")
            
        job_change = safe_get_field('job_change')
        if job_change:
            info.append(f"工作变动: {job_change}")
            
        promotion = safe_get_field('promotion')
        if promotion:
            info.append(f"晋升记录: {promotion}")
            
        awards = safe_get_field('awards')
        if awards:
            info.append(f"获奖情况: {awards}")
            
        # 其他信息 - 这些通常是布尔值，需要特殊处理
        if 'is_985' in employee and employee['is_985'] and not pd.isna(employee['is_985']):
            if employee['is_985'] == True:  # 显式检查是否为True
                info.append("985高校毕业")
                
        if 'is_211' in employee and employee['is_211'] and not pd.isna(employee['is_211']):
            if employee['is_211'] == True:  # 显式检查是否为True
                info.append("211高校毕业")
                
        if 'is_c9' in employee and employee['is_c9'] and not pd.isna(employee['is_c9']):
            if employee['is_c9'] == True:  # 显式检查是否为True
                info.append("C9联盟高校毕业")
            
        # 将所有信息用换行符连接
        return "\n".join(info)

# 创建全局聊天服务实例
hr_chat_service = HRChatService() 