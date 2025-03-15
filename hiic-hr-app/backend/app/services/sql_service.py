import re
import json
import sqlite3
import pandas as pd
import asyncio
from typing import Dict, List, Any, Optional, Union, Tuple
from app.db.supabase import supabase_client
from app.services.openrouter_service import openrouter_service
from app.core.config import settings

class SQLService:
    """SQL服务，用于处理基于SQL的查询"""
    
    def __init__(self):
        """初始化SQL服务"""
        self.df = None
        self.conn = None
        
        # 安全配置
        self.max_rows = 1000  # 最大返回行数
        self.timeout = 10     # SQL执行超时时间（秒）
        
        # 允许的SQL操作
        self.allowed_operations = ['SELECT']
        
        # 禁止的SQL关键字
        self.forbidden_keywords = [
            'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 
            'TRUNCATE', 'REPLACE', 'MERGE', 'GRANT', 'REVOKE', 'COMMIT', 
            'ROLLBACK', 'SAVEPOINT', 'TRANSACTION'
        ]
        
        self.load_data()
        
        # 获取数据库表结构
        self.db_schema = self._get_db_schema()
        # 创建系统提示
        self.system_prompt = self._create_system_prompt()
    
    def load_data(self) -> None:
        """加载员工数据并创建内存数据库"""
        try:
            # 从Supabase获取数据
            self.df = supabase_client.get_employees_as_dataframe()
            print(f"SQL服务：成功加载{len(self.df)}条员工记录")
            
            # 创建内存数据库
            self.conn = sqlite3.connect(':memory:', timeout=self.timeout)
            
            # 将数据写入SQLite
            self.df.to_sql('employees', self.conn, if_exists='replace', index=False)
            
            # 创建索引以提高查询性能
            self._create_indexes()
            
            print("SQL服务：成功创建内存数据库")
        except Exception as e:
            print(f"SQL服务：加载数据失败 - {str(e)}")
            self.df = pd.DataFrame()
            self.conn = None
    
    def _create_indexes(self) -> None:
        """创建数据库索引"""
        if self.conn is None:
            return
        
        try:
            cursor = self.conn.cursor()
            # 常用查询字段的索引
            cursor.execute('CREATE INDEX idx_name ON employees(name)')
            cursor.execute('CREATE INDEX idx_department_id ON employees(department_id)')
            cursor.execute('CREATE INDEX idx_position ON employees(position)')
            cursor.execute('CREATE INDEX idx_education ON employees(education)')
            cursor.execute('CREATE INDEX idx_gender ON employees(gender)')
            self.conn.commit()
        except Exception as e:
            print(f"SQL服务：创建索引失败 - {str(e)}")
    
    def _get_db_schema(self) -> Dict[str, Any]:
        """获取数据库表结构"""
        # 这里应该从数据库中获取实际的表结构
        # 为简化实现，这里直接硬编码表结构
        return {
            "employees": {
                "description": "员工信息表",
                "columns": [
                    {"name": "id", "type": "uuid", "description": "员工ID，主键"},
                    {"name": "name", "type": "text", "description": "员工姓名"},
                    {"name": "gender", "type": "text", "description": "性别，'男'或'女'"},
                    {"name": "age", "type": "integer", "description": "年龄"},
                    {"name": "department_id", "type": "uuid", "description": "部门ID，外键关联departments表"},
                    {"name": "position", "type": "text", "description": "职位"},
                    {"name": "salary", "type": "numeric", "description": "薪资"},
                    {"name": "hire_date", "type": "date", "description": "入职日期"},
                    {"name": "education", "type": "text", "description": "学历，如'本科'、'硕士'等"},
                    {"name": "email", "type": "text", "description": "电子邮箱"},
                    {"name": "phone", "type": "text", "description": "电话号码"}
                ]
            },
            "departments": {
                "description": "部门信息表",
                "columns": [
                    {"name": "id", "type": "uuid", "description": "部门ID，主键"},
                    {"name": "name", "type": "text", "description": "部门名称"},
                    {"name": "manager_id", "type": "uuid", "description": "部门经理ID，外键关联employees表"},
                    {"name": "description", "type": "text", "description": "部门描述"}
                ]
            },
            "attendance": {
                "description": "考勤记录表",
                "columns": [
                    {"name": "id", "type": "uuid", "description": "记录ID，主键"},
                    {"name": "employee_id", "type": "uuid", "description": "员工ID，外键关联employees表"},
                    {"name": "date", "type": "date", "description": "日期"},
                    {"name": "check_in", "type": "time", "description": "签到时间"},
                    {"name": "check_out", "type": "time", "description": "签退时间"},
                    {"name": "status", "type": "text", "description": "状态，如'正常'、'迟到'、'早退'等"}
                ]
            },
            "performance": {
                "description": "绩效评估表",
                "columns": [
                    {"name": "id", "type": "uuid", "description": "记录ID，主键"},
                    {"name": "employee_id", "type": "uuid", "description": "员工ID，外键关联employees表"},
                    {"name": "year", "type": "integer", "description": "年份"},
                    {"name": "quarter", "type": "integer", "description": "季度，1-4"},
                    {"name": "score", "type": "numeric", "description": "绩效分数"},
                    {"name": "comments", "type": "text", "description": "评语"}
                ]
            },
            "training": {
                "description": "培训记录表",
                "columns": [
                    {"name": "id", "type": "uuid", "description": "记录ID，主键"},
                    {"name": "employee_id", "type": "uuid", "description": "员工ID，外键关联employees表"},
                    {"name": "course_name", "type": "text", "description": "培训课程名称"},
                    {"name": "start_date", "type": "date", "description": "开始日期"},
                    {"name": "end_date", "type": "date", "description": "结束日期"},
                    {"name": "status", "type": "text", "description": "状态，如'进行中'、'已完成'等"},
                    {"name": "score", "type": "numeric", "description": "培训成绩"}
                ]
            }
        }
    
    def _create_system_prompt(self) -> str:
        """创建系统提示"""
        # 格式化数据库表结构
        schema_parts = []
        for table_name, table_info in self.db_schema.items():
            columns_desc = []
            for col in table_info.get("columns", []):
                columns_desc.append(f"- {col.get('name')}: {col.get('type')} - {col.get('description')}")
            
            schema_parts.append(f"""表名: {table_name}
描述: {table_info.get('description', '')}
列:
{chr(10).join(columns_desc)}
""")
        
        # 构建系统提示
        system_prompt = f"""你是HIIC公司内部HR系统的SQL专家助手。你的任务是将用户的自然语言问题转换为SQL查询，然后执行查询并以自然语言回答用户的问题。

数据库结构:
{chr(10).join(schema_parts)}

表之间的关系:
1. employees.department_id 关联 departments.id
2. departments.manager_id 关联 employees.id
3. attendance.employee_id 关联 employees.id
4. performance.employee_id 关联 employees.id
5. training.employee_id 关联 employees.id

你的工作流程:
1. 分析用户的问题，理解他们想要查询的信息
2. 将问题转换为SQL查询
3. 执行SQL查询并获取结果
4. 以自然、对话化的方式回答用户的问题，不要直接展示SQL或原始数据

SQL查询规则:
1. 使用标准的PostgreSQL语法
2. 查询应该尽可能简洁高效
3. 对于复杂问题，可以使用子查询或多个查询
4. 确保查询安全，避免SQL注入风险

回答格式:
1. 不要在回答中包含SQL查询
2. 以自然、对话化的方式回答问题
3. 将数据融入到对话中，而不是直接罗列
4. 使用亲切友好的语气，像同事之间的对话一样自然
5. 所有回答必须使用中文，语气要活泼但专业

示例:
用户问题: "研发部有多少人？"
SQL查询: SELECT COUNT(*) FROM employees e JOIN departments d ON e.department_id = d.id WHERE d.name = '研发部'
回答: "研发部目前有42名员工。这是我们公司规模第二大的部门，仅次于销售部。"

用户问题: "谁是最年轻的员工？"
SQL查询: SELECT name, age FROM employees ORDER BY age ASC LIMIT 1
回答: "我们公司最年轻的员工是李明，他今年22岁，是我们近期招聘的新鲜血液。"

记住，你的目标是提供准确、有用的信息，同时保持对话的自然流畅。
"""
        return system_prompt
    
    def validate_sql(self, sql: str) -> bool:
        """验证SQL查询的安全性"""
        # 检查是否为空
        if not sql or not isinstance(sql, str):
            return False
        
        # 转换为大写以进行检查
        sql_upper = sql.upper()
        
        # 检查是否只包含允许的操作
        if not any(op in sql_upper for op in self.allowed_operations):
            return False
        
        # 检查是否包含禁止的关键字
        for keyword in self.forbidden_keywords:
            if keyword in sql_upper:
                return False
        
        # 检查是否尝试访问系统表
        if 'SQLITE_' in sql_upper:
            return False
        
        # 检查是否有多个语句（防止SQL注入）
        if ';' in sql and not sql.strip().endswith(';'):
            return False
        
        return True
    
    async def get_sql_response(self, question: str) -> str:
        """获取SQL回复"""
        try:
            # 构建消息列表
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": f"请回答以下问题：{question}"}
            ]
            
            # 获取SQL查询
            sql_query = self._extract_sql_query(openrouter_service.get_chat_response(messages))
            
            if not sql_query:
                # 如果无法提取SQL查询，直接返回LLM的回复
                return openrouter_service.get_chat_response(messages)
            
            # 执行SQL查询
            query_result = self._execute_sql_query(sql_query)
            
            # 检查查询结果是否包含错误
            if query_result and 'error' in query_result[0]:
                error_message = query_result[0].get('message', '查询执行失败，无法提供准确数据。')
                # 构建错误消息
                error_messages = [
                    {"role": "system", "content": f"SQL查询执行失败。错误信息：{error_message}。请向用户解释我们无法提供准确答案，不要生成虚构的数据或具体数字。"},
                    {"role": "user", "content": question}
                ]
                return openrouter_service.get_chat_response(error_messages)
            
            # 构建带有查询结果的消息
            result_messages = messages.copy()
            result_messages.append({
                "role": "assistant", 
                "content": f"我将使用以下SQL查询来回答你的问题：\n```sql\n{sql_query}\n```"
            })
            result_messages.append({
                "role": "system", 
                "content": f"SQL查询结果：\n```json\n{json.dumps(query_result, ensure_ascii=False, indent=2)}\n```\n\n请根据以上SQL查询结果，以自然、对话化的方式回答用户的问题。不要在回答中包含SQL查询或直接展示原始数据。"
            })
            
            # 获取最终回复
            final_response = openrouter_service.get_chat_response(result_messages)
            
            # 清理回复
            final_response = self._clean_response(final_response)
            
            return final_response
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"SQL服务：处理失败 - {str(e)}")
            print(f"错误详情: {error_trace}")
            
            # 如果处理失败，尝试直接使用LLM回答，但明确告知这是回退方案
            try:
                simple_messages = [
                    {"role": "system", "content": "你是HIIC公司内部HR系统的AI助手。SQL查询执行失败，无法获取准确数据。请向用户解释我们无法提供准确答案，不要生成虚构的数据或具体数字。如果用户询问具体的数据统计，请诚实地告知由于技术原因无法提供精确数据，并建议用户稍后再试。"},
                    {"role": "user", "content": question}
                ]
                return openrouter_service.get_chat_response(simple_messages)
            except:
                return f"抱歉，处理您的请求时出现了问题。请稍后再试。"
    
    def _extract_sql_query(self, response: str) -> Optional[str]:
        """从回复中提取SQL查询"""
        # 尝试从代码块中提取SQL查询
        sql_pattern = r"```sql\s*(.*?)\s*```"
        matches = re.findall(sql_pattern, response, re.DOTALL)
        
        if matches:
            return matches[0].strip()
        
        # 如果没有找到SQL代码块，尝试查找其他代码块
        code_pattern = r"```\s*.*?\s*```"
        matches = re.findall(code_pattern, response, re.DOTALL)
        
        if matches:
            # 检查是否看起来像SQL查询
            for match in matches:
                if re.search(r"SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER", match, re.IGNORECASE):
                    return match.strip()
        
        return None
    
    def _execute_sql_query(self, sql_query: str) -> List[Dict[str, Any]]:
        """执行SQL查询"""
        try:
            # 使用Supabase客户端执行SQL查询
            result = supabase_client.execute_sql(sql_query)
            
            # 检查结果是否包含错误
            if result and isinstance(result, list) and len(result) > 0 and 'error' in result[0]:
                print(f"SQL查询执行失败: {result[0].get('error')}")
                print(f"错误消息: {result[0].get('message')}")
                return result
            
            print(f"SQL查询执行成功，返回{len(result)}条记录")
            return result
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"执行SQL查询时发生异常: {str(e)}")
            print(f"错误详情: {error_trace}")
            return [{'error': str(e), 'message': '查询执行失败，无法提供准确数据。'}]
    
    def _clean_response(self, response: str) -> str:
        """清理回复中的SQL查询和代码块"""
        # 移除SQL代码块
        response = re.sub(r"```sql\s*.*?\s*```", "", response, flags=re.DOTALL)
        
        # 移除其他代码块
        response = re.sub(r"```\s*.*?\s*```", "", response, flags=re.DOTALL)
        
        # 移除可能的SQL查询说明
        response = re.sub(r"我将使用以下SQL查询来回答你的问题：", "", response)
        response = re.sub(r"以下是我的SQL查询：", "", response)
        
        # 移除多余的空行
        response = re.sub(r"\n{3,}", "\n\n", response)
        
        return response.strip()

# 创建全局SQL服务实例
sql_service = SQLService() 