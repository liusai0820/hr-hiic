import re
import json
from typing import Dict, List, Any, Optional, Tuple
from app.services.openrouter_service import openrouter_service

class QuestionClassifier:
    """问题分类器，用于决定使用哪种方法回答问题"""
    
    def __init__(self):
        """初始化问题分类器"""
        # 缓存，用于存储已分类的问题模式
        self.cache = {}
        
        # 预定义的问题类型模式
        self.patterns = {
            "员工查询": [
                r"谁是.*",
                r".*员工信息.*",
                r".*个人资料.*",
                r".*的背景.*",
                r".*简历.*"
            ],
            "部门统计": [
                r".*部门.*人数.*",
                r".*部门.*多少人.*",
                r".*哪个部门.*",
                r".*部门分布.*"
            ],
            "学历分析": [
                r".*学历分布.*",
                r".*哪些学校.*",
                r".*毕业于.*",
                r".*学历.*比例.*",
                r".*教育背景.*"
            ],
            "年龄分析": [
                r".*年龄.*分布.*",
                r".*平均年龄.*",
                r".*最年轻.*",
                r".*最年长.*",
                r".*年龄段.*"
            ],
            "性别分析": [
                r".*性别.*比例.*",
                r".*男女比例.*",
                r".*男生.*女生.*",
                r".*男性.*女性.*"
            ],
            "工作年限": [
                r".*工作年限.*",
                r".*工作经验.*",
                r".*司龄.*",
                r".*年资.*"
            ]
        }
        
        # 工具映射
        self.tool_mapping = {
            "员工查询": "get_employee_by_name",
            "部门统计": "analyze_department",
            "学历分析": "analyze_education",
            "年龄分析": "analyze_age_distribution",
            "性别分析": "get_basic_stats",  # 参数：column=gender
            "工作年限": "analyze_work_years"
        }
        
        # 复杂问题关键词
        self.complex_keywords = [
            "比较", "对比", "趋势", "关联", "相关性", 
            "如果", "假设", "预测", "推测", "估计",
            "排名", "前几", "最多", "最少", "平均",
            "哪个部门", "为什么", "原因", "影响"
        ]
    
    def classify_by_pattern(self, question: str) -> Optional[str]:
        """通过模式匹配分类问题"""
        # 检查缓存
        if question in self.cache:
            return self.cache[question]
        
        # 转换为小写进行匹配
        question_lower = question.lower()
        
        # 检查是否是复杂问题
        for keyword in self.complex_keywords:
            if keyword in question_lower:
                return "sql"
        
        # 检查是否匹配预定义模式
        for category, patterns in self.patterns.items():
            for pattern in patterns:
                if re.search(pattern, question, re.IGNORECASE):
                    # 获取对应的工具
                    tool = self.tool_mapping.get(category)
                    if tool:
                        result = f"tool:{tool}"
                        # 缓存结果
                        self.cache[question] = result
                        return result
        
        # 默认使用SQL
        return "sql"
    
    async def classify_by_model(self, question: str) -> str:
        """使用模型分类问题"""
        # 构建提示
        prompt = f"""作为一个问题分类器，请分析以下问题，并决定使用哪种方法回答。

问题: {question}

可用的方法:
1. 工具方法 - 使用预定义的工具函数，适合简单、明确的问题
2. SQL方法 - 使用SQL查询，适合复杂、需要数据分析的问题

工具方法适合的问题类型:
- 查询特定员工信息
- 获取特定部门的基本统计
- 查看基本的年龄或学历分布
- 简单的统计数据查询

SQL方法适合的问题类型:
- 需要比较多个维度的问题
- 包含排序、筛选、分组的复杂查询
- 需要计算或推理的问题
- 跨多个数据类型的分析

请分析问题并回答使用哪种方法，只回答"工具"或"SQL"。"""
        
        # 调用OpenRouter API进行分类
        response = openrouter_service.get_chat_response([{"role": "user", "content": prompt}])
        
        # 解析响应
        if "sql" in response.lower():
            return "sql"
        else:
            return "tool"
    
    async def classify(self, question: str) -> str:
        """分类问题，决定使用哪种方法回答"""
        # 首先尝试模式匹配（快速路径）
        pattern_result = self.classify_by_pattern(question)
        if pattern_result:
            print(f"问题分类器：通过模式匹配分类 - {pattern_result}")
            return pattern_result
        
        # 如果模式匹配失败，使用模型分类（慢路径）
        model_result = await self.classify_by_model(question)
        print(f"问题分类器：通过模型分类 - {model_result}")
        return model_result
    
    def extract_parameters(self, question: str, tool: str) -> Dict[str, Any]:
        """从问题中提取工具参数"""
        params = {}
        
        if tool == "get_employee_by_name":
            # 提取人名
            name_match = re.search(r"(谁是|关于|查询)\s*([^\s,，。？?!！]+)", question)
            if name_match:
                params["name"] = name_match.group(2)
        
        elif tool == "analyze_department":
            # 提取部门名
            dept_match = re.search(r"([^，。？?!！\s]+部门|[^，。？?!！\s]+部)", question)
            if dept_match:
                dept = dept_match.group(1)
                # 规范化部门名称
                if not dept.endswith("部") and not dept.endswith("部门"):
                    dept += "部"
                params["department"] = dept
        
        elif tool == "get_basic_stats" and "性别" in question:
            params["column"] = "gender"
        
        return params

# 创建全局问题分类器实例
question_classifier = QuestionClassifier() 