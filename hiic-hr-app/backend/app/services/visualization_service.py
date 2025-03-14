import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple, Optional
from app.db.supabase import supabase_client

class VisualizationService:
    """数据可视化服务"""
    
    def __init__(self):
        """初始化可视化服务"""
        # 加载HR数据
        self.df = self._load_hr_data()
    
    def _load_hr_data(self) -> pd.DataFrame:
        """加载HR数据"""
        try:
            return supabase_client.get_employees_as_dataframe()
        except Exception as e:
            print(f"加载HR数据失败: {str(e)}")
            return pd.DataFrame()
    
    def department_distribution(self) -> Dict[str, Any]:
        """部门人员分布可视化数据"""
        if self.df.empty or 'department' not in self.df.columns:
            return {"error": "无法获取部门数据"}
        
        # 获取部门分布
        dept_counts = self.df['department'].value_counts()
        
        return {
            "title": "部门人员分布",
            "description": "展示各部门人员数量分布情况",
            "xAxis": dept_counts.index.tolist(),
            "yAxis": dept_counts.values.tolist(),
            "data": {dept: int(count) for dept, count in dept_counts.items()}
        }
    
    def gender_distribution(self) -> Dict[str, Any]:
        """性别分布可视化数据"""
        if self.df.empty or 'gender' not in self.df.columns:
            return {"error": "无法获取性别数据"}
        
        # 获取性别分布
        gender_counts = self.df['gender'].value_counts()
        
        return {
            "title": "性别分布",
            "description": "展示公司员工性别比例分布",
            "labels": gender_counts.index.tolist(),
            "values": gender_counts.values.tolist(),
            "data": {gender: int(count) for gender, count in gender_counts.items()}
        }
    
    def age_distribution(self) -> Dict[str, Any]:
        """年龄分布可视化数据"""
        if self.df.empty or 'age' not in self.df.columns:
            return {"error": "无法获取年龄数据"}
        
        # 创建年龄分组
        age_bins = [0, 25, 30, 35, 40, 45, 50, 100]
        age_labels = ['25岁以下', '26-30岁', '31-35岁', '36-40岁', '41-45岁', '46-50岁', '50岁以上']
        
        # 分组统计
        age_groups = pd.cut(self.df['age'], bins=age_bins, labels=age_labels)
        age_counts = age_groups.value_counts().sort_index()
        
        # 计算年龄统计信息
        age_stats = {
            "mean": float(self.df['age'].mean()),
            "median": float(self.df['age'].median()),
            "min": float(self.df['age'].min()),
            "max": float(self.df['age'].max()),
            "std": float(self.df['age'].std())
        }
        
        return {
            "title": "年龄分布",
            "description": "展示公司员工年龄段分布情况",
            "xAxis": age_counts.index.tolist(),
            "yAxis": age_counts.values.tolist(),
            "data": {str(age): int(count) for age, count in age_counts.items()},
            "stats": age_stats
        }
    
    def education_distribution(self) -> Dict[str, Any]:
        """学历分布可视化数据"""
        if self.df.empty or 'education' not in self.df.columns:
            return {"error": "无法获取学历数据"}
        
        # 获取学历分布
        edu_counts = self.df['education'].value_counts()
        
        return {
            "title": "学历分布",
            "description": "展示公司员工学历层次分布情况",
            "xAxis": edu_counts.index.tolist(),
            "yAxis": edu_counts.values.tolist(),
            "data": {edu: int(count) for edu, count in edu_counts.items()}
        }
    
    def university_distribution(self) -> Dict[str, Any]:
        """高校分布可视化数据"""
        if self.df.empty or 'university' not in self.df.columns:
            return {"error": "无法获取高校数据"}
        
        # 获取高校分布（只取前10名）
        uni_counts = self.df['university'].value_counts().head(10)
        
        return {
            "title": "高校分布",
            "description": "展示员工毕业院校分布情况（Top 10）",
            "yAxis": uni_counts.index.tolist(),
            "xAxis": uni_counts.values.tolist(),
            "data": {uni: int(count) for uni, count in uni_counts.items()}
        }
    
    def work_years_distribution(self) -> Dict[str, Any]:
        """工作年限分布可视化数据"""
        if self.df.empty or 'total_work_years' not in self.df.columns:
            return {"error": "无法获取工作年限数据"}
        
        # 创建工作年限分组
        work_bins = [0, 3, 5, 10, 15, 20, 100]
        work_labels = ['3年以下', '3-5年', '5-10年', '10-15年', '15-20年', '20年以上']
        
        # 分组统计
        work_groups = pd.cut(self.df['total_work_years'], bins=work_bins, labels=work_labels)
        work_counts = work_groups.value_counts().sort_index()
        
        # 计算工作年限统计信息
        work_stats = {
            "mean": float(self.df['total_work_years'].mean()),
            "median": float(self.df['total_work_years'].median()),
            "min": float(self.df['total_work_years'].min()),
            "max": float(self.df['total_work_years'].max()),
            "std": float(self.df['total_work_years'].std())
        }
        
        return {
            "title": "工作年限分布",
            "description": "展示员工工作经验年限分布情况",
            "xAxis": work_counts.index.tolist(),
            "yAxis": work_counts.values.tolist(),
            "data": {str(work): int(count) for work, count in work_counts.items()},
            "stats": work_stats
        }
    
    def get_all_visualizations(self) -> Dict[str, Dict[str, Any]]:
        """获取所有可视化数据"""
        return {
            "department": self.department_distribution(),
            "gender": self.gender_distribution(),
            "age": self.age_distribution(),
            "education": self.education_distribution(),
            "university": self.university_distribution(),
            "work_years": self.work_years_distribution()
        }

# 创建全局可视化服务实例
visualization_service = VisualizationService() 