import re
import json
import sqlite3
import pandas as pd
import asyncio
from typing import Dict, List, Any, Optional, Union, Tuple
from app.db.supabase import supabase_client
from app.services.openrouter_service import openrouter_service
from app.core.config import settings
import time
import logging

# 配置日志记录器
logger = logging.getLogger(__name__)

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
        
        # 数据库表名
        self.table_name = "employees"
        # 员工数据
        self.employees = []
        # 加载数据
        self.load_data()
        # 表结构信息
        self.schema = self._get_db_schema()
        # 结果缓存
        self.results_cache = {}
        # 部门统计数据缓存
        self.department_stats_cache = None
        self.department_stats_cache_expiry = None
        # 缓存过期时间（秒）
        self.cache_expiry_seconds = 300  # 5分钟
        
        # 性能统计
        self.query_count = 0
        self.cache_hit_count = 0
        self.api_call_count = 0
        
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
            
            # 获取表的实际列名
            cursor.execute("PRAGMA table_info(employees)")
            columns = cursor.fetchall()
            column_names = [col[1] for col in columns]
            print(f"SQL服务：employees表的实际列名: {column_names}")
            
            # 为常用列创建索引（如果存在）
            if 'name' in column_names:
                cursor.execute('CREATE INDEX idx_name ON employees(name)')
                print("SQL服务：已在name列上创建索引")
                
            if 'department' in column_names:
                cursor.execute('CREATE INDEX idx_department ON employees(department)')
                print("SQL服务：已在department列上创建索引")
                
            if 'position' in column_names:
                cursor.execute('CREATE INDEX idx_position ON employees(position)')
                print("SQL服务：已在position列上创建索引")
                
            if 'education_level' in column_names:
                cursor.execute('CREATE INDEX idx_education_level ON employees(education_level)')
                print("SQL服务：已在education_level列上创建索引")
            elif 'education' in column_names:
                cursor.execute('CREATE INDEX idx_education ON employees(education)')
                print("SQL服务：已在education列上创建索引")
                
            if 'gender' in column_names:
                cursor.execute('CREATE INDEX idx_gender ON employees(gender)')
                print("SQL服务：已在gender列上创建索引")
                
            if 'age' in column_names:
                cursor.execute('CREATE INDEX idx_age ON employees(age)')
                print("SQL服务：已在age列上创建索引")
                
            if 'university' in column_names:
                cursor.execute('CREATE INDEX idx_university ON employees(university)')
                print("SQL服务：已在university列上创建索引")
                
            self.conn.commit()
            print("SQL服务：索引创建完成")
        except Exception as e:
            print(f"SQL服务：创建索引失败 - {str(e)}")
    
    def _get_db_schema(self) -> Dict[str, Any]:
        """获取数据库表结构"""
        # 如果有连接，从数据库中获取实际的表结构
        if self.conn is not None:
            try:
                cursor = self.conn.cursor()
                # 获取employees表的列信息
                cursor.execute("PRAGMA table_info(employees)")
                columns = cursor.fetchall()
                
                # 构建实际的表结构
                actual_schema = {
                    "employees": {
                        "description": "员工信息表",
                        "columns": []
                    }
                }
                
                # 列信息格式: (cid, name, type, notnull, dflt_value, pk)
                for col in columns:
                    col_name = col[1]
                    col_type = col[2]
                    
                    # 为常见列添加描述
                    description = ""
                    if col_name == "id":
                        description = "员工ID，主键"
                    elif col_name == "name":
                        description = "员工姓名"
                    elif col_name == "gender":
                        description = "性别，'男'或'女'"
                    elif col_name == "age":
                        description = "年龄"
                    elif col_name == "department":
                        description = "部门名称"
                    elif col_name == "position":
                        description = "职位"
                    elif col_name == "education" or col_name == "education_level":
                        description = "学历，如'本科'、'硕士'等"
                    elif col_name == "university":
                        description = "毕业院校"
                    elif col_name == "major":
                        description = "专业"
                    elif col_name == "hire_date":
                        description = "入职日期"
                    elif col_name == "birth_date":
                        description = "出生日期"
                    elif col_name == "total_work_years" or col_name == "company_years":
                        description = "工作年限"
                    else:
                        description = f"{col_name}字段"
                    
                    actual_schema["employees"]["columns"].append({
                        "name": col_name,
                        "type": col_type,
                        "description": description
                    })
                
                print(f"SQL服务：成功从数据库获取表结构，employees表有{len(actual_schema['employees']['columns'])}列")
                return actual_schema
            except Exception as e:
                print(f"SQL服务：从数据库获取表结构失败 - {str(e)}")
        
        # 如果无法从数据库获取，使用硬编码的表结构
        print("SQL服务：使用默认表结构")
        return {
            "employees": {
                "description": "员工信息表",
                "columns": [
                    {"name": "id", "type": "text", "description": "员工ID，主键"},
                    {"name": "name", "type": "text", "description": "员工姓名"},
                    {"name": "gender", "type": "text", "description": "性别，'男'或'女'"},
                    {"name": "age", "type": "integer", "description": "年龄"},
                    {"name": "department", "type": "text", "description": "部门名称"},
                    {"name": "position", "type": "text", "description": "职位"},
                    {"name": "education_level", "type": "text", "description": "学历，如'本科'、'硕士'等"},
                    {"name": "university", "type": "text", "description": "毕业院校"},
                    {"name": "major", "type": "text", "description": "专业"},
                    {"name": "hire_date", "type": "text", "description": "入职日期"},
                    {"name": "total_work_years", "type": "numeric", "description": "工作年限"},
                    {"name": "company_years", "type": "numeric", "description": "在职年限"}
                ]
            },
            "departments": {
                "description": "部门信息表",
                "columns": [
                    {"name": "id", "type": "text", "description": "部门ID，主键"},
                    {"name": "name", "type": "text", "description": "部门名称"},
                    {"name": "manager_id", "type": "text", "description": "部门经理ID，外键关联employees表"},
                    {"name": "description", "type": "text", "description": "部门描述"}
                ]
            },
            "education": {
                "description": "教育背景表",
                "columns": [
                    {"name": "id", "type": "text", "description": "记录ID，主键"},
                    {"name": "employee_id", "type": "text", "description": "员工ID，外键关联employees表"},
                    {"name": "university", "type": "text", "description": "毕业院校"},
                    {"name": "major", "type": "text", "description": "专业"},
                    {"name": "education_level", "type": "text", "description": "学历，如'本科'、'硕士'等"},
                    {"name": "degree", "type": "text", "description": "学位"}
                ]
            },
            "work_experience": {
                "description": "工作经验表",
                "columns": [
                    {"name": "id", "type": "text", "description": "记录ID，主键"},
                    {"name": "employee_id", "type": "text", "description": "员工ID，外键关联employees表"},
                    {"name": "company_years", "type": "numeric", "description": "在职年限"},
                    {"name": "total_work_years", "type": "numeric", "description": "工作总年限"},
                    {"name": "hire_date", "type": "text", "description": "入职日期"}
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
1. education.employee_id 关联 employees.id - 员工的教育背景
2. work_experience.employee_id 关联 employees.id - 员工的工作经验

重要的日期处理说明:
1. hire_date字段存储入职日期，格式为YYYY-MM-DD
2. 对于涉及年份的查询（如查询特定年份入职的员工），应使用以下SQL函数:
   - SUBSTR(hire_date, 1, 4) 提取年份
   - 例如：WHERE SUBSTR(hire_date, 1, 4) = '2017'
3. 可能需要在employees表和work_experience表中都检查hire_date字段
4. 对于特定日期范围的查询，使用字符串比较：
   - 例如：WHERE hire_date >= '2017-01-01' AND hire_date <= '2017-12-31'

你的工作流程:
1. 分析用户的问题，理解他们想要查询的信息
2. 将问题转换为SQL查询
3. 执行SQL查询并获取结果
4. 以自然、对话化的方式回答用户的问题，不要直接展示SQL或原始数据

回复格式和语言风格：
1. 完全不要使用Markdown格式（不使用*、**、#、-等符号）
2. 使用自然对话方式，就像人与人对话一样流畅
3. 不要使用列表符号，直接用自然语言表达
4. 以"好的"或类似的自然开场白开始回答
5. 使用简单直接的语言，没有技术性标记
6. 将数据融入到自然对话中，不要罗列数据
7. 用中文回答，语气要友好活泼但专业
8. 不要说"根据数据"或"查询结果表明"等技术性表达
9. 不要在一句话开头使用"嗨"、"您好"等问候语（只在答案最开始可以）

示例:
用户问题: "大数据平台与信息部有多少人？"
SQL查询: SELECT COUNT(*) as count FROM employees WHERE department = '大数据平台与信息部'
错误回答: "根据查询结果，大数据平台与信息部有42人。"
正确回答: "好的，大数据平台与信息部目前有42名员工，这是我们公司规模较大的部门之一。"

用户问题: "谁是最年轻的员工？"
SQL查询: SELECT name, age FROM employees ORDER BY age ASC LIMIT 1
错误回答: "**最年轻的员工**是李明，年龄22岁。"
正确回答: "我们公司最年轻的员工是李明，他今年22岁，是我们近期招聘的新鲜血液。"

用户问题: "各部门的人数分布如何？"
SQL查询: SELECT department, COUNT(*) as count FROM employees GROUP BY department ORDER BY count DESC
错误回答: "各部门人数分布如下：
* 大数据平台与信息部：42人
* 研发部：35人
* 市场部：28人
..."
正确回答: "好的，让我来告诉你公司各部门的人数分布情况。大数据平台与信息部有42人，是我们人数最多的部门。研发部有35人，市场部有28人，财务部有15人，人力资源部有10人，运营部有8人，产品部有7人。这些部门都是我们公司的核心力量，支撑着公司的日常运营和业务发展。"

记住，你的目标是提供准确、有用并且自然流畅的信息。不要使用任何Markdown格式或代码块，就像正常人对话一样表达。
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
    
    def _is_valid_sql(self, sql: str) -> bool:
        """检查SQL是否有效"""
        # 不允许非SELECT语句
        if not sql.strip().upper().startswith("SELECT"):
            return False
        
        # 检查是否有多个语句（防止SQL注入）
        if ';' in sql and not sql.strip().endswith(';'):
            return False
        
        return True
    
    async def get_sql_response(self, question: str) -> str:
        """获取SQL回复"""
        import time
        start_time = time.time()
        
        try:
            # 记录开始处理时间
            logger.info(f"开始处理SQL查询: {question[:50]}...")
            
            # 检查是否是部门人数分布查询
            if self._is_department_stats_query(question):
                logger.info("检测到部门人数分布查询，使用优化路径处理")
                return await self._handle_department_stats_query()
            
            # 预处理问题，提取年份信息和简单分析问题类型
            processed_question, years = self._preprocess_date_query(question)
            
            # 增强系统提示，添加问题相关信息
            enhanced_prompt = self._enhance_system_prompt(question, years)
            
            # 构建消息列表
            messages = [
                {"role": "system", "content": enhanced_prompt},
                {"role": "user", "content": f"请分析并回答以下问题，直接生成最合适的SQL查询：{processed_question}"}
            ]
            
            # 获取SQL查询
            logger.info("向OpenRouter发送SQL生成请求...")
            response = await openrouter_service.get_chat_response(messages)
            sql_query = self._extract_sql_query(response)
            
            if not sql_query:
                logger.warning("无法从响应中提取SQL查询，尝试再次请求...")
                # 如果无法提取SQL，尝试明确指示大模型生成SQL
                clarification_messages = [
                    {"role": "system", "content": enhanced_prompt},
                    {"role": "user", "content": f"请为以下问题生成一个SQL查询。必须返回SQL代码块：{processed_question}"}
                ]
                response = await openrouter_service.get_chat_response(clarification_messages)
                sql_query = self._extract_sql_query(response)
                
                if not sql_query:
                    # 仍然无法获取SQL，尝试使用简单规则生成基本查询
                    logger.warning("二次尝试仍无法提取SQL，使用简单规则生成查询...")
                    sql_query = self._generate_simple_sql(question)
            
            # 记录生成的SQL查询
            logger.info(f"最终SQL查询: {sql_query}")
            
            # 执行SQL查询
            try:
                print(f"尝试在Supabase上执行SQL查询: {sql_query}...")
                results = self._execute_sql_query(sql_query)
                print(f"SQL查询执行成功，返回{len(results)}条记录")
            except Exception as sql_error:
                # SQL执行错误，尝试修复
                logger.error(f"SQL查询执行错误: {str(sql_error)}")
                fixed_sql = await self._attempt_sql_fix(sql_query, str(sql_error), processed_question)
                if fixed_sql:
                    logger.info(f"修复后的SQL: {fixed_sql}")
                    results = self._execute_sql_query(fixed_sql)
                    print(f"修复后的SQL查询执行成功，返回{len(results)}条记录")
                else:
                    # 无法修复，返回错误信息
                    logger.error("无法修复SQL查询")
                    return f"抱歉，无法执行您的查询。可能的问题: {str(sql_error)[:100]}... 请尝试重新表述您的问题。"
            
            # 构建最终响应的上下文
            final_context = {
                "question": question,
                "sql_query": sql_query,
                "results": results
            }
            
            # 生成自然语言回复
            logger.info("发送最终回复请求...")
            final_response = await self._generate_natural_language_response(final_context)
            
            # 记录总耗时
            elapsed_time = time.time() - start_time
            logger.info(f"SQL查询处理总耗时: {elapsed_time:.2f}秒")
            
            return final_response
            
        except Exception as e:
            elapsed_time = time.time() - start_time
            logger.error(f"SQL查询处理失败: {str(e)}")
            logger.error(f"处理耗时: {elapsed_time:.2f}秒")
            return f"抱歉，处理您的查询时出现了问题: {str(e)[:100]}... 请稍后再试。"
            
    def _is_department_stats_query(self, question: str) -> bool:
        """判断是否是部门人数分布统计查询"""
        patterns = [
            r'各(个)?部门.*(人数|分布)',
            r'部门.*(人数|分布)',
            r'(人数|人员).*(分布|分配)',
            r'(多少|几个).*(人员|员工).*(部门|分布)',
            r'(员工|人员).*分布.*部门',
            r'公司.*部门.*构成',
            r'(公司|企业).*员工分布',
            r'(部门|岗位).*结构',
            r'员工分布情况',
            r'人员构成',
            r'人力资源分布',
            r'组织结构'
        ]
        
        for pattern in patterns:
            if re.search(pattern, question):
                return True
        return False
        
    async def _handle_department_stats_query(self) -> str:
        """专门处理部门人数分布查询"""
        # 检查缓存
        if self._is_valid_department_stats_cache():
            logger.info("使用部门统计数据缓存")
            return self.department_stats_cache
            
        import time
        start_time = time.time()
        
        try:
            # 从数据库获取部门统计数据
            dept_data = self._get_department_stats()
            
            # 如果没有获取到数据，返回错误信息
            if not dept_data:
                logger.error("未能获取到部门统计数据")
                return "抱歉，我目前无法获取部门人数分布信息。系统可能正在维护或数据暂时不可用。请稍后再试。"
            
            # 构建回复内容
            top_departments = sorted(dept_data, key=lambda x: x['count'], reverse=True)
            
            # 构建系统提示
            prompt = f"""你是HIIC公司内部HR系统的AI助手。基于以下真实部门人数数据，以自然、友好、对话化的方式回答用户的问题。
            
下面是各部门人数统计数据:
"""
            
            # 添加部门数据
            for dept in top_departments:
                prompt += f"- {dept['department']}: {dept['count']}人\n"
                
            prompt += """
回答要求:
1. 使用自然、对话化的语言描述部门人数分布情况
2. 重点介绍人数最多的前5个部门，其余部门可以概括说明
3. 不要使用任何Markdown格式（如粗体、斜体、标题、列表符号等）
4. 不要呈现为表格形式，而是使用流畅的文字描述
5. 语气要友好专业，像同事之间交谈一样

用户问题: "各部门的人数分布如何？"
"""
            
            try:
                # 获取回复
                messages = [
                    {"role": "system", "content": prompt}
                ]
                
                self.api_call_count += 1
                response = await openrouter_service.get_chat_response(messages)
                
                # 清理回复
                final_response = self._clean_response(response)
                
                # 缓存结果
                self.department_stats_cache = final_response
                self.department_stats_cache_expiry = time.time() + self.cache_expiry_seconds
                
                # 记录耗时
                elapsed_time = time.time() - start_time
                logger.info(f"部门统计查询处理耗时: {elapsed_time:.2f}秒")
                
                return final_response
            except Exception as api_error:
                # API调用失败，手动构建响应
                logger.error(f"API调用失败: {str(api_error)}")
                
                # 手动构建响应
                manual_response = "好的，让我来告诉你公司各部门的人数分布情况。"
                
                # 添加前5个最大部门
                top_5 = top_departments[:5]
                for i, dept in enumerate(top_5):
                    if i == 0:
                        manual_response += f" {dept['department']}有{dept['count']}人，是我们人数最多的部门。"
                    elif i == len(top_5) - 1:
                        manual_response += f"{dept['department']}有{dept['count']}人。"
                    else:
                        manual_response += f"{dept['department']}有{dept['count']}人，"
                
                # 添加其他部门的概括
                other_depts = top_departments[5:]
                if other_depts:
                    total_other = sum(d['count'] for d in other_depts)
                    manual_response += f" 其他{len(other_depts)}个部门共有{total_other}人，分布相对均匀。每个部门都有其专业特长，共同构成了我们公司完整的组织架构。"
                
                # 缓存手动响应
                self.department_stats_cache = manual_response
                self.department_stats_cache_expiry = time.time() + self.cache_expiry_seconds
                
                return manual_response
                
        except Exception as e:
            logger.error(f"部门统计查询处理失败: {str(e)}")
            return f"抱歉，获取部门人数分布时出现了问题: {str(e)[:100]}... 请稍后再试。"
            
    def _is_valid_department_stats_cache(self) -> bool:
        """检查部门统计数据缓存是否有效"""
        if self.department_stats_cache is None or self.department_stats_cache_expiry is None:
            return False
            
        return time.time() < self.department_stats_cache_expiry
        
    def _get_department_stats(self) -> List[Dict[str, Any]]:
        """获取部门统计数据"""
        departments = {}
        
        # 从Supabase直接获取部门统计数据
        logger.info("从Supabase直接获取部门统计数据...")
        
        try:
            # 使用execute_sql而不是execute_query
            dept_records = supabase_client.execute_sql("SELECT department FROM employees")
            
            # 统计每个部门的人数
            for record in dept_records:
                dept = record.get('department')
                if dept:
                    if dept not in departments:
                        departments[dept] = 0
                    departments[dept] += 1
                    
            # 转换为列表格式
            result = []
            for dept, count in departments.items():
                result.append({
                    "department": dept,
                    "count": count
                })
                print(f"部门 '{dept}' 有 {count} 名员工")
                
            return result
        except Exception as e:
            logger.error(f"获取部门统计数据失败: {str(e)}")
            # 使用备用方法 - 直接从内存数据库查询
            if self.conn:
                try:
                    cursor = self.conn.cursor()
                    cursor.execute("SELECT department, COUNT(*) as count FROM employees GROUP BY department ORDER BY count DESC")
                    backup_result = []
                    for row in cursor.fetchall():
                        if row[0]:  # 确保部门名称不为空
                            backup_result.append({
                                "department": row[0],
                                "count": row[1]
                            })
                            print(f"部门 '{row[0]}' 有 {row[1]} 名员工 (备用查询)")
                    return backup_result
                except Exception as backup_error:
                    logger.error(f"备用查询也失败: {str(backup_error)}")
            
            # 如果所有查询都失败，返回空列表
            return []
        
    async def _generate_natural_language_response(self, context: Dict[str, Any]) -> str:
        """生成自然语言回复"""
        question = context["question"]
        sql_query = context["sql_query"]
        results = context["results"]
        
        # 构建提示
        prompt = f"""你是HIIC公司内部HR系统的AI助手。我需要你基于SQL查询结果，以自然、友好、对话化的方式回答用户的问题。

用户问题: {question}

执行的SQL查询: {sql_query}

查询结果: {json.dumps(results, ensure_ascii=False)}

请遵循以下要求:
1. 基于查询结果提供准确信息，不要编造数据
2. 使用自然、对话化的语言，避免技术术语
3. 不要使用任何Markdown格式（如粗体、斜体、标题、列表符号等）
4. 不要提及SQL查询本身，只提供答案
5. 语气要友好专业，像同事之间交谈一样
6. 如果结果为空，友好地告知未找到相关信息
"""

        # 获取回复
        messages = [
            {"role": "system", "content": prompt}
        ]
        
        self.api_call_count += 1
        response = await openrouter_service.get_chat_response(messages)
        
        # 清理回复
        return self._clean_response(response)
    
    def _enhance_system_prompt(self, question: str, years: list) -> str:
        """根据问题增强系统提示"""
        # 基础系统提示
        enhanced_prompt = self.system_prompt
        
        # 分析问题类型，添加针对性提示
        if "部门" in question and "负责人" in question:
            enhanced_prompt += "\n\n特别说明：对于部门负责人的查询，你应该查找该部门中职位级别最高的员工。职位级别判断规则：\n"
            enhanced_prompt += "1. 部长、所长、主任、总监、负责人为最高级别\n"
            enhanced_prompt += "2. 副部长、副所长、副主任、副总监为第二级别\n"
            enhanced_prompt += "3. 高级研究员、主管、经理为第三级别\n"
            enhanced_prompt += "可以使用SQL中的CASE表达式或其他方法来判断职位级别。"
            enhanced_prompt += "示例: \n```sql\nSELECT name, position, department FROM employees WHERE department LIKE '%大数据平台与信息部%' ORDER BY \n"
            enhanced_prompt += "CASE \n"
            enhanced_prompt += "  WHEN position LIKE '%部长%' OR position LIKE '%所长%' OR position LIKE '%主任%' OR position LIKE '%总监%' THEN 1\n"
            enhanced_prompt += "  WHEN position LIKE '%副部长%' OR position LIKE '%副所长%' OR position LIKE '%副主任%' THEN 2\n"
            enhanced_prompt += "  ELSE 3\n"
            enhanced_prompt += "END\n```"
        
        # 添加年份处理提示
        if years:
            enhanced_prompt += f"\n\n特别提示：用户问题中提到了年份 {', '.join(years)}。"
            if "入职" in question or "加入" in question:
                enhanced_prompt += f"\n对于入职年份的查询，请使用: SUBSTR(hire_date, 1, 4) = '{years[0]}'"
                enhanced_prompt += f"\n或者: hire_date LIKE '{years[0]}%'"
                enhanced_prompt += f"\n如果需要检查工作经验表，可能需要: SUBSTR(first_work_date, 1, 4) = '{years[0]}'"
        
        # 添加部门统计提示
        if "部门" in question and ("人数" in question or "多少人" in question):
            enhanced_prompt += "\n\n部门人数统计查询示例:\n"
            enhanced_prompt += "```sql\nSELECT department, COUNT(*) as count FROM employees GROUP BY department ORDER BY count DESC\n```"
        
        # 确保实体名称映射正确
        if "大数据" in question:
            enhanced_prompt += "\n注意：'大数据部'的正式名称是'大数据平台与信息部'。"
        
        return enhanced_prompt
        
    async def _attempt_sql_fix(self, sql_query: str, error_message: str, original_question: str) -> Optional[str]:
        """尝试修复错误的SQL查询"""
        try:
            # 构建提示以修复SQL
            fix_prompt = f"""你是SQL修复专家。原始SQL查询执行失败，请修复它。

原始SQL查询:
```sql
{sql_query}
```

错误信息: {error_message}

用户原始问题: {original_question}

数据库模式:
{json.dumps(self.db_schema, ensure_ascii=False, indent=2)}

请提供修复后的SQL查询，只返回修复后的SQL查询代码，不要解释。
"""
            
            # 构建消息
            messages = [
                {"role": "system", "content": "你是SQL修复专家，帮助修复SQL查询错误。"},
                {"role": "user", "content": fix_prompt}
            ]
            
            # 获取修复后的SQL
            fixed_sql_response = await openrouter_service.get_chat_response(messages)
            fixed_sql = self._extract_sql_query(fixed_sql_response)
            
            # 如果无法提取SQL，尝试全文使用
            if not fixed_sql:
                # 尝试去除可能的说明文字
                cleaned_response = re.sub(r'^.*?```sql', '', fixed_sql_response, flags=re.DOTALL)
                cleaned_response = re.sub(r'```.*$', '', cleaned_response, flags=re.DOTALL)
                if "SELECT" in cleaned_response.upper():
                    fixed_sql = cleaned_response.strip()
            
            return fixed_sql
        except Exception as e:
            logger.error(f"尝试修复SQL失败: {str(e)}")
            return None
    
    def _generate_simple_sql(self, question: str) -> str:
        """生成简单的SQL查询"""
        # 默认查询所有员工
        sql = "SELECT * FROM employees"
        
        # 如果涉及特定部门
        department_match = re.search(r'(大数据平台与信息部|数字经济研究所|生物经济研究所|海洋经济研究所|城市轨道与城市发展研究所)', question)
        if department_match:
            department = department_match.group(1)
            sql = f"SELECT * FROM employees WHERE department LIKE '%{department}%'"
            
            # 如果是询问人数
            if "多少人" in question or "人数" in question:
                sql = f"SELECT COUNT(*) as count FROM employees WHERE department LIKE '%{department}%'"
        
        # 如果涉及统计
        if "部门" in question and "人数" in question:
            sql = "SELECT department, COUNT(*) as count FROM employees GROUP BY department ORDER BY count DESC"
        
        # 如果涉及部门负责人
        if "负责人" in question or "部长" in question or "所长" in question:
            department_match = re.search(r'(大数据平台与信息部|数字经济研究所|生物经济研究所|海洋经济研究所|城市轨道与城市发展研究所)', question)
            if department_match:
                department = department_match.group(1)
                sql = f"""SELECT name, position, department FROM employees 
                         WHERE department LIKE '%{department}%' 
                         ORDER BY CASE 
                           WHEN position LIKE '%部长%' OR position LIKE '%所长%' OR position LIKE '%主任%' THEN 1
                           WHEN position LIKE '%副部长%' OR position LIKE '%副所长%' OR position LIKE '%副主任%' THEN 2
                           ELSE 3
                         END LIMIT 1"""
        
        return sql
    
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
        if not response:
            return ""
            
        # 记录原始长度用于日志
        original_length = len(response)
        logger.debug(f"开始清理响应，原始长度: {original_length}字符")
        
        # 移除SQL代码块 (包括各种SQL语法高亮变体)
        patterns = [
            r"```sql\s*[\s\S]*?```",  # SQL语法高亮
            r"```mysql\s*[\s\S]*?```", # MySQL语法高亮
            r"```sqlite\s*[\s\S]*?```", # SQLite语法高亮
            r"```\s*SELECT[\s\S]*?```", # 以SELECT开头的无语言代码块
            r"```\s*[\s\S]*?```",      # 任何代码块
            r"`[^`]+`",                # 内联代码块
        ]
        
        for pattern in patterns:
            response = re.sub(pattern, "", response, flags=re.IGNORECASE)
        
        # 移除常见的SQL查询说明语句
        sql_intros = [
            r"我将使用以下SQL查询[^:：]*[:：]",
            r"以下是(我的|用于解答的)?SQL查询[:：]",
            r"(首先|让我)(使用|执行|运行)SQL查询[:：]",
            r"(我(将|要|准备)(执行|运行|使用).*查询|查询数据库)[^:：]*[:：]",
            r"根据SQL查询结果[^:：]*[:：]",
            r"SQL查询结果[^:：]*[:：]"
        ]
        
        for intro in sql_intros:
            response = re.sub(intro, "", response, flags=re.IGNORECASE)
        
        # 移除Markdown格式
        # 粗体
        response = re.sub(r'\*\*([^*]+)\*\*', r'\1', response)
        # 斜体
        response = re.sub(r'\*([^*]+)\*', r'\1', response)
        # 下划线
        response = re.sub(r'__([^_]+)__', r'\1', response)
        # 删除线
        response = re.sub(r'~~([^~]+)~~', r'\1', response)
        
        # 移除Markdown列表
        response = re.sub(r'^\s*[*\-+]\s+', '', response, flags=re.MULTILINE)
        response = re.sub(r'^\s*\d+\.\s+', '', response, flags=re.MULTILINE)
        
        # 移除Markdown标题
        response = re.sub(r'^#{1,6}\s+', '', response, flags=re.MULTILINE)
        
        # 移除Markdown链接
        response = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', response)
        
        # 移除Markdown表格
        response = re.sub(r'^\|.*\|$', '', response, flags=re.MULTILINE)
        response = re.sub(r'^\|-+\|$', '', response, flags=re.MULTILINE)
        
        # 移除多余的空行和空格
        response = re.sub(r'\n{3,}', '\n\n', response)
        response = re.sub(r'[ \t]+\n', '\n', response)
        response = re.sub(r'\n[ \t]+', '\n', response)
        
        # 最后整体修剪空白
        response = response.strip()
        
        logger.debug(f"清理后长度: {len(response)}字符，减少了{original_length - len(response)}字符")
        return response

    def _preprocess_date_query(self, question: str) -> tuple:
        """预处理问题，提取年份信息"""
        # 提取年份信息
        year_pattern = r'(\d{4})年?'
        years = re.findall(year_pattern, question)
        
        # 返回处理后的问题和提取的年份
        return question, years

# 创建全局SQL服务实例
sql_service = SQLService() 