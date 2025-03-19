import os
import re
import json
import hashlib
import aiohttp
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import time
from app.services.openrouter_service import openrouter_service

logger = logging.getLogger(__name__)

class QuestionClassifier:
    """问题分类器，用于决定使用哪种方法回答问题"""
    
    def __init__(self):
        """初始化问题分类器"""
        # 分类缓存，格式: {hash: {"result": 分类结果, "timestamp": 时间戳}}
        self.cache = {}
        # 用于更快访问的类型缓存
        self.type_cache = {}
        # 缓存过期时间（天）
        self.cache_expiry_days = 7
        # 尝试加载持久化缓存
        self._load_cache()
        
        # 保留一些基本模式用于快速匹配
        self.fast_patterns = {
            "SQL_QUERY": [
                r"有多少.*(员工|人员|同事|人)",
                r"(员工|人员|同事).*(人数|数量)",
                r"\d+年.*(入职|加入)",
                r"(入职|加入).*\d+年",
                r"(总共|一共|共有|共计).*(有多少|几个|多少个)",
                r"(谁是|谁担任|谁负责|谁主管|谁分管)(.*)(负责人|部长|所长|主任|主管)",
                r"(负责人是谁|部长是谁|所长是谁|主任是谁|主管是谁)",
                r"(哪些|哪位|什么人)(担任|是|作为)(.*)(负责人|部长|所长|主任|主管)"
            ],
            "VISUALIZATION": [
                r"(展示|显示|看看|查看).*(图表|分布|比例)",
                r"(图|图表|可视化).*(展示|显示)",
                r"(画|绘制).*(图|图表)"
            ]
        }
        
        # 系统提示
        self.system_prompt = "你是HR系统的问题分类专家，能准确将用户问题分类为SQL查询、数据可视化、数据分析或一般问题。"
        
    async def classify(self, question: str) -> str:
        """对问题进行分类
        
        Args:
            question: 用户问题
            
        Returns:
            问题类型: SQL_QUERY, VISUALIZATION, DATA_ANALYSIS, HYBRID_QUERY, GENERAL_QUERY
        """
        # 首先检查缓存
        cache_key = self._generate_cache_key(question)
        cached_type = self.type_cache.get(cache_key)
        if cached_type:
            logger.info(f"缓存命中: 问题 '{question[:20]}...' 分类为 {cached_type}")
            return cached_type
        
        # 检查问题是否与部门相关
        dept_patterns = [
            r'(大数据平台与信息部|数字经济研究所|生物经济研究所|海洋经济研究所|城市轨道与城市发展研究所|创新中心|党委办公室|合规管理部|综合协同部|战略发展与项目管理部)',
            r'(\w+部|\w+所|\w+中心)'
        ]
        
        for pattern in dept_patterns:
            if re.search(pattern, question):
                logger.info(f"快速分类: 问题 '{question[:20]}...' 包含部门名称，分类为 SQL_QUERY")
                self.type_cache[cache_key] = "SQL_QUERY"
                return "SQL_QUERY"
        
        # 部门负责人查询的模式
        dept_head_pattern = r'(谁是|谁担任|谁负责|谁主管|谁分管)(.*?)(负责人|部长|所长|主任|主管|的)'
        if re.search(dept_head_pattern, question):
            logger.info(f"快速分类: 问题 '{question[:20]}...' 是部门负责人查询，分类为 SQL_QUERY")
            self.type_cache[cache_key] = "SQL_QUERY"
            return "SQL_QUERY"
        
        # 关键词快速识别
        # 与数据查询相关的关键词
        sql_keywords = [
            "多少", "平均", "查询", "统计", "人数", "比例", "百分比", "总数", "查找", 
            "哪些", "列出", "平均年龄", "平均工资", "平均薪资", "几个", "几人", "谁是", 
            "入职", "年份", "年龄", "毕业", "学历", "大学", "本科", "硕士", "博士", 
            "学位", "专业"
        ]
        
        # 与数据可视化相关的关键词
        viz_keywords = [
            "图表", "图形", "可视化", "柱状图", "饼图", "折线图", "直方图", "散点图",
            "画一个", "展示一下", "看一下", "分布图", "趋势图", "展示"
        ]
        
        # 与数据分析相关的关键词
        analysis_keywords = [
            "分析", "预测", "趋势", "相关性", "关联", "影响因素", "对比",
            "增长", "下降", "变化", "模式", "特征", "总结", "建议"
        ]
        
        # 检查问题是否包含这些关键词
        if self._contains_keywords(question, sql_keywords):
            logger.info(f"快速分类: 问题 '{question[:20]}...' 识别为 SQL_QUERY")
            self.type_cache[cache_key] = "SQL_QUERY"
            return "SQL_QUERY"
        
        if self._contains_keywords(question, viz_keywords) and not self._contains_keywords(question, ["不需要图"]):
            logger.info(f"快速分类: 问题 '{question[:20]}...' 识别为 VISUALIZATION")
            self.type_cache[cache_key] = "VISUALIZATION"
            return "VISUALIZATION"
        
        if self._contains_keywords(question, analysis_keywords):
            logger.info(f"快速分类: 问题 '{question[:20]}...' 识别为 DATA_ANALYSIS")
            self.type_cache[cache_key] = "DATA_ANALYSIS"
            return "DATA_ANALYSIS"
        
        # 使用模型进行分类
        start_time = time.time()
        try:
            # 构建分类提示
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": question}
            ]
            
            # 获取模型回复
            response = await openrouter_service.get_chat_response(messages, model_type="classifier")
            response = response.strip().upper()
            
            # 提取分类结果
            if "SQL_QUERY" in response:
                result = "SQL_QUERY"
            elif "VISUALIZATION" in response:
                result = "VISUALIZATION"
            elif "DATA_ANALYSIS" in response:
                result = "DATA_ANALYSIS"
            elif "HYBRID_QUERY" in response:
                result = "HYBRID_QUERY"
            else:
                result = "GENERAL_QUERY"
            
            # 记录分类时间
            elapsed_time = (time.time() - start_time) * 1000
            logger.info(f"模型分类: 问题 '{question[:20]}...' 分类为 {result}, 耗时 {elapsed_time:.2f}ms")
            
            # 缓存结果
            self.type_cache[cache_key] = result
            return result
        except Exception as e:
            logger.error(f"模型分类失败: {str(e)}")
            # 如果模型分类失败，使用保守的默认分类
            return "HYBRID_QUERY"
    
    async def _call_fast_model(self, question: str) -> str:
        """调用轻量级AI模型进行分类"""
        
        # 准备简洁的分类提示模板
        prompt = f"""将以下HR系统用户问题准确分类为以下5种类型之一:
- SQL_QUERY: 需要查询具体数据的问题(如统计人数、查询员工信息等)
- VISUALIZATION: 需要图表可视化的问题(如展示分布、查看比例等)
- DATA_ANALYSIS: 需要分析数据或评估情况的问题
- HYBRID_QUERY: 混合型HR问题，可能需要多种处理方式
- GENERAL_QUERY: 普通问题，可以基于HR领域知识直接回答，不必查询数据库的每一条记录

只回复一个分类类型，不要解释，不要其他内容。

问题: {question}
"""
        
        # 获取分类用的消息列表
        messages = [
            {"role": "system", "content": "你是HR问题分类专家，能准确分类用户问题。"},
            {"role": "user", "content": prompt}
        ]
        
        try:
            # 使用OpenRouter服务发送请求，指定使用classifier模型
            classification = await openrouter_service.get_chat_response(messages, model_type="classifier")
            return classification.strip()
        except Exception as e:
            logger.error(f"调用分类模型失败: {str(e)}")
            # 出错时返回默认分类
            return "HYBRID_QUERY"
    
    def _clean_question(self, question: str) -> str:
        """清理问题文本"""
        if not question:
            return ""
        # 去除多余空格
        cleaned = " ".join(question.split())
        return cleaned
    
    def _hash_question(self, question: str) -> str:
        """计算问题的哈希值，用于缓存"""
        return hashlib.md5(question.encode('utf-8')).hexdigest()
    
    def _get_from_cache(self, question_hash: str) -> Optional[str]:
        """从缓存中获取分类结果"""
        if question_hash in self.cache:
            cache_entry = self.cache[question_hash]
            # 检查缓存是否过期
            timestamp = datetime.fromisoformat(cache_entry["timestamp"])
            if datetime.now() - timestamp < timedelta(days=self.cache_expiry_days):
                return cache_entry["result"]
            else:
                # 删除过期缓存
                del self.cache[question_hash]
        return None
    
    def _add_to_cache(self, question_hash: str, classification: str) -> None:
        """将分类结果添加到缓存"""
        self.cache[question_hash] = {
            "result": classification,
            "timestamp": datetime.now().isoformat()
        }
        # 持久化缓存
        self._save_cache()
    
    def _normalize_classification(self, classification: str, valid_classifications: List[str]) -> str:
        """标准化分类结果"""
        # 移除可能的标点符号和空白
        cleaned = classification.strip().strip('"\'.,;:()[]{}').upper()
        
        # 检查完全匹配
        for valid in valid_classifications:
            if cleaned == valid:
                return valid
                
        # 检查部分匹配
        for valid in valid_classifications:
            if valid in cleaned:
                return valid
        
        # 如果无法匹配，默认使用混合查询
        return "HYBRID_QUERY"
    
    def _save_cache(self) -> None:
        """保存缓存到文件"""
        try:
            # 创建缓存目录
            cache_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "cache")
            os.makedirs(cache_dir, exist_ok=True)
            
            # 写入缓存文件
            cache_file = os.path.join(cache_dir, "classification_cache.json")
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(self.cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"保存缓存失败: {str(e)}")
    
    def _load_cache(self) -> None:
        """从文件加载缓存"""
        try:
            cache_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "cache")
            cache_file = os.path.join(cache_dir, "classification_cache.json")
            if os.path.exists(cache_file):
                with open(cache_file, "r", encoding="utf-8") as f:
                    self.cache = json.load(f)
                logger.info(f"已加载 {len(self.cache)} 条分类缓存")
        except Exception as e:
            logger.warning(f"加载缓存失败: {str(e)}")
            self.cache = {}
    
    def _track_classification(self, question: str, classification: str, latency_ms: float) -> None:
        """记录分类数据用于监控和改进"""
        try:
            # 确保监控目录存在
            monitoring_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "monitoring")
            os.makedirs(monitoring_dir, exist_ok=True)
            
            # 记录分类结果
            log_file = os.path.join(monitoring_dir, "classifications.jsonl")
            with open(log_file, "a", encoding="utf-8") as f:
                record = {
                    "timestamp": datetime.now().isoformat(),
                    "question_hash": self._hash_question(question),
                    "question_preview": question[:50] + "..." if len(question) > 50 else question,
                    "classification": classification,
                    "latency_ms": latency_ms
                }
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
                
            # 更新分类统计
            stats_file = os.path.join(monitoring_dir, "classification_stats.json")
            stats = {"total": 0, "by_type": {}, "latency": {"sum": 0, "count": 0}}
            
            # 尝试读取现有统计
            if os.path.exists(stats_file):
                try:
                    with open(stats_file, "r", encoding="utf-8") as f:
                        stats = json.load(f)
                except:
                    pass
            
            # 更新统计数据
            stats["total"] = stats.get("total", 0) + 1
            stats["by_type"][classification] = stats.get("by_type", {}).get(classification, 0) + 1
            stats["latency"]["sum"] = stats.get("latency", {}).get("sum", 0) + latency_ms
            stats["latency"]["count"] = stats.get("latency", {}).get("count", 0) + 1
            
            # 写回文件
            with open(stats_file, "w", encoding="utf-8") as f:
                json.dump(stats, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            logger.warning(f"记录分类监控数据失败: {str(e)}")
            
    def _convert_to_legacy_type(self, new_classification: str) -> str:
        """将新的分类结果转换为旧有的类型，保持兼容性"""
        # 映射关系
        classification_map = {
            "SQL_QUERY": "sql",
            "VISUALIZATION": "tool:visualization",
            "DATA_ANALYSIS": "sql", # 分析通常需要SQL能力
            "HYBRID_QUERY": "sql", # 混合查询默认使用SQL服务
            "GENERAL_QUERY": "general"
        }
        
        return classification_map.get(new_classification, "sql")
    
    # 保留extract_parameters方法保持兼容性
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

    def _generate_cache_key(self, question: str) -> str:
        """生成缓存键"""
        # 简单的规范化处理
        key = question.lower().strip()
        # 移除标点符号
        key = re.sub(r'[^\w\s]', '', key)
        # 移除多余空格
        key = re.sub(r'\s+', ' ', key)
        return key
    
    def _contains_keywords(self, text: str, keywords: List[str]) -> bool:
        """检查文本是否包含关键词"""
        text = text.lower()
        for keyword in keywords:
            if keyword.lower() in text:
                return True
        return False

# 创建全局问题分类器实例
question_classifier = QuestionClassifier() 