import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple, Optional
from app.db.supabase import supabase_client

class VisualizationService:
    """数据可视化服务"""
    
    def __init__(self):
        """初始化可视化服务"""
        # 加载HR数据
        self.df_employees = self._load_employees_data()
        self.df_education = self._load_education_data()
        self.df_work_experience = self._load_work_experience_data()
        
        # 合并数据
        self._merge_data()
    
    def _load_employees_data(self) -> pd.DataFrame:
        """加载员工数据"""
        try:
            return supabase_client.get_employees_as_dataframe()
        except Exception as e:
            print(f"加载员工数据失败: {str(e)}")
            return pd.DataFrame()
    
    def _load_education_data(self) -> pd.DataFrame:
        """加载教育背景数据"""
        try:
            # 获取教育数据
            education_data = supabase_client.get_all_education()
            if not education_data:
                print("警告: 没有获取到任何教育数据")
                return pd.DataFrame()
            
            return pd.DataFrame(education_data)
        except Exception as e:
            print(f"加载教育数据失败: {str(e)}")
            return pd.DataFrame()
    
    def _load_work_experience_data(self) -> pd.DataFrame:
        """加载工作经验数据"""
        try:
            # 获取工作经验数据
            work_experience_data = supabase_client.get_all_work_experience()
            if not work_experience_data:
                print("警告: 没有获取到任何工作经验数据")
                return pd.DataFrame()
            
            return pd.DataFrame(work_experience_data)
        except Exception as e:
            print(f"加载工作经验数据失败: {str(e)}")
            return pd.DataFrame()
    
    def _merge_data(self):
        """合并所有数据"""
        # 创建合并后的数据框
        self.df = self.df_employees.copy()
        
        # 如果教育数据存在，合并到主数据框
        if not self.df_education.empty and 'employee_id' in self.df_education.columns:
            # 确保employee_id列类型一致
            self.df_education['employee_id'] = self.df_education['employee_id'].astype(str)
            self.df['id'] = self.df['id'].astype(str)
            
            # 左连接教育数据
            self.df = pd.merge(
                self.df, 
                self.df_education, 
                left_on='id', 
                right_on='employee_id', 
                how='left',
                suffixes=('', '_edu')
            )
            print(f"合并教育数据后的列: {list(self.df.columns)}")
        
        # 如果工作经验数据存在，合并到主数据框
        if not self.df_work_experience.empty and 'employee_id' in self.df_work_experience.columns:
            # 确保employee_id列类型一致
            self.df_work_experience['employee_id'] = self.df_work_experience['employee_id'].astype(str)
            
            # 左连接工作经验数据
            self.df = pd.merge(
                self.df, 
                self.df_work_experience, 
                left_on='id', 
                right_on='employee_id', 
                how='left',
                suffixes=('', '_work')
            )
            print(f"合并工作经验数据后的列: {list(self.df.columns)}")
    
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
            "平均年龄": round(float(self.df['age'].mean()), 1),
            "中位年龄": round(float(self.df['age'].median()), 1),
            "最小年龄": int(self.df['age'].min()),
            "最大年龄": int(self.df['age'].max())
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
        # 检查是否有教育数据
        if self.df.empty or 'education_level' not in self.df.columns:
            # 尝试使用员工表中的education字段
            if 'education' in self.df.columns:
                edu_column = 'education'
            else:
                return {"error": "无法获取学历数据"}
        else:
            edu_column = 'education_level'
        
        # 获取学历分布
        edu_counts = self.df[edu_column].value_counts()
        
        # 计算学历统计信息
        total = edu_counts.sum()
        edu_stats = {}
        for edu, count in edu_counts.items():
            percentage = round((count / total) * 100, 1)
            edu_stats[f"{edu}比例"] = percentage
        
        return {
            "title": "学历分布",
            "description": "展示公司员工学历层次分布情况",
            "xAxis": edu_counts.index.tolist(),
            "yAxis": edu_counts.values.tolist(),
            "data": {edu: int(count) for edu, count in edu_counts.items()},
            "stats": edu_stats
        }
    
    def university_distribution(self) -> Dict[str, Any]:
        """高校分布可视化数据"""
        # 检查是否有大学数据
        if self.df.empty or 'university' not in self.df.columns:
            return {"error": "无法获取高校数据"}
        
        # 获取高校分布（只取前10名）
        uni_counts = self.df['university'].value_counts().head(10)
        
        # 计算高校统计信息
        uni_stats = {
            "高校总数": len(self.df['university'].unique()),
            "985高校人数": int(self.df.get('is_985', pd.Series([False] * len(self.df))).sum()),
            "211高校人数": int(self.df.get('is_211', pd.Series([False] * len(self.df))).sum()),
            "C9高校人数": int(self.df.get('is_c9', pd.Series([False] * len(self.df))).sum())
        }
        
        return {
            "title": "高校分布",
            "description": "展示员工毕业院校分布情况（Top 10）",
            "yAxis": uni_counts.index.tolist(),
            "xAxis": uni_counts.values.tolist(),
            "data": {uni: int(count) for uni, count in uni_counts.items()},
            "stats": uni_stats
        }
    
    def work_years_distribution(self) -> Dict[str, Any]:
        """工作年限分布可视化数据"""
        # 检查是否有工作年限数据
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
            "平均工作年限": round(float(self.df['total_work_years'].mean()), 1),
            "中位工作年限": round(float(self.df['total_work_years'].median()), 1),
            "最短工作年限": round(float(self.df['total_work_years'].min()), 1),
            "最长工作年限": round(float(self.df['total_work_years'].max()), 1)
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

    def get_employees_by_category(self, visualization_type: str, category: str) -> List[Dict[str, Any]]:
        """获取特定可视化分类下的员工列表
        
        Args:
            visualization_type: 可视化类型，如'age', 'department', 'education'等
            category: 分类名称，如'25岁以下', '研发部', '本科'等
            
        Returns:
            符合条件的员工列表
        """
        if self.df.empty:
            return []
            
        # 根据不同的可视化类型，应用不同的筛选条件
        if visualization_type == 'age':
            # 年龄分布
            age_bins = [0, 25, 30, 35, 40, 45, 50, 100]
            age_labels = ['25岁以下', '26-30岁', '31-35岁', '36-40岁', '41-45岁', '46-50岁', '50岁以上']
            
            # 找到对应的年龄范围
            if category not in age_labels:
                raise ValueError(f"无效的年龄分类: {category}")
                
            idx = age_labels.index(category)
            min_age = age_bins[idx]
            max_age = age_bins[idx + 1]
            
            # 筛选符合条件的员工
            if idx == len(age_labels) - 1:  # 最后一个分类
                filtered_df = self.df[(self.df['age'] >= min_age)]
            else:
                filtered_df = self.df[(self.df['age'] >= min_age) & (self.df['age'] < max_age)]
                
        elif visualization_type == 'department':
            # 部门分布
            if 'department' not in self.df.columns:
                return []
                
            filtered_df = self.df[self.df['department'] == category]
            
        elif visualization_type == 'gender':
            # 性别分布
            if 'gender' not in self.df.columns:
                return []
                
            filtered_df = self.df[self.df['gender'] == category]
            
        elif visualization_type == 'education':
            # 学历分布
            edu_column = 'education_level' if 'education_level' in self.df.columns else 'education'
            if edu_column not in self.df.columns:
                return []
                
            filtered_df = self.df[self.df[edu_column] == category]
            
        elif visualization_type == 'university':
            # 高校分布
            if 'university' not in self.df.columns:
                return []
                
            filtered_df = self.df[self.df['university'] == category]
            
        elif visualization_type == 'work_years':
            # 工作年限分布
            if 'total_work_years' not in self.df.columns:
                return []
                
            work_bins = [0, 3, 5, 10, 15, 20, 100]
            work_labels = ['3年以下', '3-5年', '5-10年', '10-15年', '15-20年', '20年以上']
            
            # 找到对应的工作年限范围
            if category not in work_labels:
                raise ValueError(f"无效的工作年限分类: {category}")
                
            idx = work_labels.index(category)
            min_years = work_bins[idx]
            max_years = work_bins[idx + 1]
            
            # 筛选符合条件的员工
            if idx == len(work_labels) - 1:  # 最后一个分类
                filtered_df = self.df[(self.df['total_work_years'] >= min_years)]
            else:
                filtered_df = self.df[(self.df['total_work_years'] >= min_years) & (self.df['total_work_years'] < max_years)]
        else:
            raise ValueError(f"不支持的可视化类型: {visualization_type}")
            
        # 选择需要返回的列
        result_columns = ['id', 'name', 'gender', 'age', 'department', 'position']
        available_columns = [col for col in result_columns if col in filtered_df.columns]
        
        # 转换为字典列表
        result = filtered_df[available_columns].to_dict('records')
        
        # 限制返回数量，避免数据过大
        return result[:100]

# 创建全局可视化服务实例
visualization_service = VisualizationService() 