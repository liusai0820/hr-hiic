import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from app.db.supabase import supabase_client

class HRDataAnalysisService:
    """HR数据分析服务，提供各种数据分析功能"""
    
    def __init__(self):
        """初始化数据分析服务"""
        self.df = None
        self.load_data()
    
    def load_data(self) -> None:
        """加载员工数据"""
        try:
            self.df = supabase_client.get_employees_as_dataframe()
            print(f"数据分析服务：成功加载{len(self.df)}条员工记录")
        except Exception as e:
            print(f"数据分析服务：加载数据失败 - {str(e)}")
            self.df = pd.DataFrame()
    
    def refresh_data(self) -> None:
        """刷新数据"""
        self.load_data()
    
    # 基础统计分析
    def get_basic_stats(self, column: str) -> Dict[str, Any]:
        """获取基本统计信息"""
        if self.df.empty or column not in self.df.columns:
            return {}
        
        # 检查列的数据类型
        if pd.api.types.is_numeric_dtype(self.df[column]):
            # 数值型数据
            stats = {
                "count": int(self.df[column].count()),
                "mean": float(self.df[column].mean()),
                "median": float(self.df[column].median()),
                "min": float(self.df[column].min()),
                "max": float(self.df[column].max()),
                "std": float(self.df[column].std())
            }
        else:
            # 分类数据
            value_counts = self.df[column].value_counts().to_dict()
            stats = {
                "count": int(self.df[column].count()),
                "unique_values": len(value_counts),
                "top_values": {str(k): int(v) for k, v in list(value_counts.items())[:10]}
            }
        
        return stats
    
    # 部门分析
    def analyze_department(self, department: str) -> Dict[str, Any]:
        """分析特定部门的数据"""
        if self.df.empty:
            return {}
        
        dept_df = self.df[self.df['department'] == department]
        if dept_df.empty:
            return {}
        
        result = {
            "员工数量": len(dept_df),
            "平均年龄": float(dept_df['age'].mean()) if 'age' in dept_df.columns else None,
            "平均工作年限": float(dept_df['total_work_years'].mean()) if 'total_work_years' in dept_df.columns else None,
            "学历分布": dept_df['education'].value_counts().to_dict() if 'education' in dept_df.columns else {},
            "性别比例": dept_df['gender'].value_counts().to_dict() if 'gender' in dept_df.columns else {}
        }
        
        return result
    
    # 年龄分析
    def analyze_age_distribution(self) -> Dict[str, Any]:
        """分析年龄分布"""
        if self.df.empty or 'age' not in self.df.columns:
            return {}
        
        # 创建年龄段
        bins = [0, 25, 30, 35, 40, 45, 50, 100]
        labels = ['25岁以下', '26-30岁', '31-35岁', '36-40岁', '41-45岁', '46-50岁', '50岁以上']
        self.df['age_group'] = pd.cut(self.df['age'], bins=bins, labels=labels)
        
        # 计算各年龄段人数
        age_distribution = self.df['age_group'].value_counts().sort_index().to_dict()
        
        # 计算平均年龄
        avg_age = float(self.df['age'].mean())
        
        # 计算中位数年龄
        median_age = float(self.df['age'].median())
        
        return {
            "平均年龄": avg_age,
            "中位数年龄": median_age,
            "年龄分布": {str(k): int(v) for k, v in age_distribution.items()}
        }
    
    # 学历分析
    def analyze_education(self) -> Dict[str, Any]:
        """分析学历分布"""
        if self.df.empty or 'education' not in self.df.columns:
            return {}
        
        # 学历分布
        edu_distribution = self.df['education'].value_counts().to_dict()
        
        # 学历与部门交叉分析
        if 'department' in self.df.columns:
            edu_by_dept = {}
            for dept in self.df['department'].unique():
                dept_df = self.df[self.df['department'] == dept]
                edu_by_dept[dept] = dept_df['education'].value_counts().to_dict()
        else:
            edu_by_dept = {}
        
        return {
            "学历分布": {str(k): int(v) for k, v in edu_distribution.items()},
            "各部门学历分布": {str(k): {str(k2): int(v2) for k2, v2 in v.items()} for k, v in edu_by_dept.items()}
        }
    
    # 工作年限分析
    def analyze_work_years(self) -> Dict[str, Any]:
        """分析工作年限分布"""
        if self.df.empty or 'total_work_years' not in self.df.columns:
            return {}
        
        # 创建工作年限段
        bins = [0, 3, 5, 10, 15, 20, 100]
        labels = ['3年以下', '3-5年', '5-10年', '10-15年', '15-20年', '20年以上']
        self.df['work_years_group'] = pd.cut(self.df['total_work_years'], bins=bins, labels=labels)
        
        # 计算各工作年限段人数
        work_years_distribution = self.df['work_years_group'].value_counts().sort_index().to_dict()
        
        # 计算平均工作年限
        avg_work_years = float(self.df['total_work_years'].mean())
        
        # 计算中位数工作年限
        median_work_years = float(self.df['total_work_years'].median())
        
        return {
            "平均工作年限": avg_work_years,
            "中位数工作年限": median_work_years,
            "工作年限分布": {str(k): int(v) for k, v in work_years_distribution.items()}
        }
    
    # 高级分析：部门间比较
    def compare_departments(self, metric: str) -> Dict[str, Any]:
        """比较不同部门的特定指标"""
        if self.df.empty or 'department' not in self.df.columns or metric not in self.df.columns:
            return {}
        
        # 检查指标类型
        if not pd.api.types.is_numeric_dtype(self.df[metric]):
            # 对于非数值型指标，返回各部门的分布
            result = {}
            for dept in self.df['department'].unique():
                dept_df = self.df[self.df['department'] == dept]
                result[dept] = dept_df[metric].value_counts().to_dict()
            return result
        
        # 对于数值型指标，计算各部门的统计值
        result = {}
        for dept in self.df['department'].unique():
            dept_df = self.df[self.df['department'] == dept]
            result[dept] = {
                "平均值": float(dept_df[metric].mean()),
                "中位数": float(dept_df[metric].median()),
                "最小值": float(dept_df[metric].min()),
                "最大值": float(dept_df[metric].max()),
                "标准差": float(dept_df[metric].std())
            }
        
        return result

# 创建全局数据分析服务实例
hr_data_analysis = HRDataAnalysisService() 