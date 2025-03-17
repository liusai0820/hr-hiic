import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple, Optional
from app.db.supabase import supabase_client
import re

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
        
        # 计算部门统计信息
        dept_stats = {
            "部门总数": len(dept_counts),
            "平均人数": round(dept_counts.mean()),
            "最大部门": int(dept_counts.max()),
            "最小部门": int(dept_counts.min()),
            "人员分布标准差": round(dept_counts.std(), 1),  # 新增：衡量部门人数分布的均衡性
            "中位数部门规模": int(dept_counts.median()),  # 新增：中位数部门规模
            "最大与平均比": round(dept_counts.max() / dept_counts.mean(), 1),  # 新增：最大部门与平均规模比例
            "部门规模集中度": round(dept_counts.nlargest(3).sum() / dept_counts.sum() * 100)  # 新增：前三大部门占比
        }
        
        return {
            "title": "部门人员分布",
            "description": "展示各部门人员数量分布情况",
            "xAxis": dept_counts.index.tolist(),
            "yAxis": dept_counts.values.tolist(),
            "data": {dept: int(count) for dept, count in dept_counts.items()},
            "stats": dept_stats
        }
    
    def gender_distribution(self) -> Dict[str, Any]:
        """性别分布可视化数据"""
        if self.df.empty or 'gender' not in self.df.columns:
            return {"error": "无法获取性别数据"}
        
        # 获取性别分布
        gender_counts = self.df['gender'].value_counts()
        total = gender_counts.sum()
        
        # 计算性别比例
        male_count = gender_counts.get('男', 0)
        female_count = gender_counts.get('女', 0)
        
        # 计算性别比（男/女）
        gender_ratio = round(male_count / female_count, 2) if female_count > 0 else 0
        
        # 计算统计信息
        gender_stats = {
            "总人数": int(total),
            "男性比例": round(male_count / total * 100) if total > 0 else 0,
            "女性比例": round(female_count / total * 100) if total > 0 else 0,
            "性别比": gender_ratio,  # 新增：男女比例
            "男女差异": int(abs(male_count - female_count)),  # 新增：男女人数差异
            "多数性别": "男" if male_count >= female_count else "女",  # 新增：多数性别
            "性别多样性指数": round(1 - ((male_count/total)**2 + (female_count/total)**2), 2) if total > 0 else 0  # 新增：性别多样性指数(基于赫芬达尔指数)
        }
        
        return {
            "title": "性别比例分布",
            "description": "公司员工性别比例分布",
            "labels": gender_counts.index.tolist(),
            "values": gender_counts.values.tolist(),
            "data": {gender: int(count) for gender, count in gender_counts.items()},
            "stats": gender_stats
        }
    
    def age_distribution(self) -> Dict[str, Any]:
        """年龄分布可视化数据"""
        if self.df.empty or 'age' not in self.df.columns:
            return {"error": "无法获取年龄数据"}
        
        # 定义年龄段
        age_bins = [0, 25, 30, 35, 40, 45, 50, 100]
        age_labels = ['25岁以下', '26-30岁', '31-35岁', '36-40岁', '41-45岁', '46-50岁', '50岁以上']
        
        # 计算年龄分布
        age_series = pd.cut(self.df['age'], bins=age_bins, labels=age_labels, right=False)
        age_counts = age_series.value_counts().sort_index()
        
        # 计算年龄统计信息
        age_stats = {
            "平均年龄": round(self.df['age'].mean(), 1),
            "中位年龄": int(self.df['age'].median()),
            "最大年龄": int(self.df['age'].max()),
            "最小年龄": int(self.df['age'].min()),
            "年龄标准差": round(self.df['age'].std(), 1),  # 新增：年龄分布的离散程度
            "青年比例": round(len(self.df[self.df['age'] <= 35]) / len(self.df) * 100),  # 新增：35岁及以下员工比例
            "中年比例": round(len(self.df[(self.df['age'] > 35) & (self.df['age'] <= 50)]) / len(self.df) * 100),  # 新增：36-50岁员工比例
            "资深比例": round(len(self.df[self.df['age'] > 50]) / len(self.df) * 100)  # 新增：50岁以上员工比例
        }
        
        return {
            "title": "年龄分布",
            "description": "公司员工年龄段分布情况",
            "xAxis": age_counts.index.tolist(),
            "yAxis": age_counts.values.tolist(),
            "data": {age: int(count) for age, count in age_counts.items()},
            "stats": age_stats
        }
    
    def education_distribution(self) -> Dict[str, Any]:
        """学历分布可视化数据"""
        if self.df.empty or ('education' not in self.df.columns and 'education_level' not in self.df.columns):
            return {"error": "无法获取学历数据"}
        
        # 确定使用哪个列作为学历
        edu_col = 'education' if 'education' in self.df.columns else 'education_level'
        
        # 获取学历分布
        edu_counts = self.df[edu_col].value_counts()
        
        # 计算高学历比例（硕士及以上）
        total = edu_counts.sum()
        high_edu = edu_counts.get('博士', 0) + edu_counts.get('硕士', 0)
        bachelor = edu_counts.get('本科', 0)
        
        # 计算海外学历占比
        overseas_count = 0
        if 'university' in self.df.columns:
            overseas_count = self.df[self.df['university'].apply(
                lambda x: isinstance(x, str) and (
                    '海外' in x or 
                    '国外' in x or 
                    'University' in x or 
                    'College' in x or
                    'Institute' in x or
                    (isinstance(x, str) and bool(re.match(r'^[A-Za-z]', x))) or
                    '香港' in x or
                    '澳门' in x or
                    '台湾' in x
                ) if isinstance(x, str) else False
            )].shape[0]
        
        # 计算博士比例
        doctor_count = 0
        for key in edu_counts.keys():
            if isinstance(key, str) and '博士' in key:
                doctor_count += edu_counts[key]
        
        # 计算985/211院校比例
        elite_count = 0
        if 'is_985' in self.df.columns and 'is_211' in self.df.columns:
            elite_count = self.df[(self.df['is_985'] == True) | (self.df['is_211'] == True)].shape[0]
        elif 'university' in self.df.columns:
            elite_universities = [
                '清华', '北大', '复旦', '上海交通', '浙江大学', '南京大学', 
                '中国科学技术大学', '武汉大学', '华中科技', '西安交通', 
                '哈尔滨工业', '南开', '天津大学', '同济', '北京航空', '北京理工'
            ]
            elite_count = self.df[self.df['university'].apply(
                lambda x: any(u in x for u in elite_universities) if isinstance(x, str) else False
            )].shape[0]
        
        # 计算学历统计信息
        edu_stats = {
            "高学历比例": round(high_edu / total * 100) if total > 0 else 0,
            "本科比例": round(bachelor / total * 100) if total > 0 else 0,
            "硕士及以上比例": round(high_edu / total * 100) if total > 0 else 0,
            "博士比例": round(doctor_count / total * 100) if total > 0 else 0,
            "最高学历人数": int(edu_counts.iloc[0]) if not edu_counts.empty else 0,
            "最高学历占比": round(edu_counts.iloc[0] / total * 100) if not edu_counts.empty and total > 0 else 0,
            "学历多样性指数": round(1 - sum((count/total)**2 for count in edu_counts), 2) if total > 0 else 0,
            "海外学历占比": round(overseas_count / total * 100) if total > 0 else 0,
            "985/211院校比例": round(elite_count / total * 100) if total > 0 else 0,
            "学历结构评分": self._calculate_education_score(edu_counts)
        }
        
        return {
            "title": "学历分布",
            "description": "公司员工学历层次分布情况",
            "labels": edu_counts.index.tolist(),
            "values": edu_counts.values.tolist(),
            "data": {edu: int(count) for edu, count in edu_counts.items()},
            "stats": edu_stats
        }
        
    def _calculate_education_score(self, edu_counts):
        """计算学历结构评分（满分100）"""
        if edu_counts.empty:
            return 0
            
        total = edu_counts.sum()
        if total == 0:
            return 0
            
        # 定义各学历权重
        weights = {
            '博士': 1.0,
            '硕士': 0.8,
            '本科': 0.6,
            '大专': 0.4,
            '高中': 0.2,
            '其他': 0.1
        }
        
        # 计算加权分数
        score = 0
        for edu, count in edu_counts.items():
            weight = weights.get(edu, 0.1)  # 默认权重0.1
            score += (count / total) * weight
            
        # 归一化到100分制
        return round(score * 100, 0)
    
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
        }
        
        # 如果有985/211/C9标记，添加相应统计
        if 'is_985' in self.df.columns:
            uni_stats["985高校人数"] = int(self.df['is_985'].sum())
        if 'is_211' in self.df.columns:
            uni_stats["211高校人数"] = int(self.df['is_211'].sum())
        if 'is_c9' in self.df.columns:
            uni_stats["C9高校人数"] = int(self.df['is_c9'].sum())
        
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
        if self.df.empty or ('total_work_years' not in self.df.columns and 'work_years' not in self.df.columns):
            return {"error": "无法获取工作年限数据"}
        
        # 确定使用哪个列作为工作年限
        work_years_col = 'total_work_years' if 'total_work_years' in self.df.columns else 'work_years'
        
        # 定义工作年限段
        work_years_bins = [0, 1, 3, 5, 10, 15, 100]
        work_years_labels = ['1年以下', '1-3年', '3-5年', '5-10年', '10-15年', '15年以上']
        
        # 计算工作年限分布
        work_years_series = pd.cut(self.df[work_years_col], bins=work_years_bins, labels=work_years_labels, right=False)
        work_years_counts = work_years_series.value_counts().sort_index()
        
        # 计算各类员工比例
        total = len(self.df)
        junior_count = len(self.df[self.df[work_years_col] < 3])  # 3年以下为初级
        mid_count = len(self.df[(self.df[work_years_col] >= 3) & (self.df[work_years_col] < 10)])  # 3-10年为中级
        senior_count = len(self.df[self.df[work_years_col] >= 10])  # 10年以上为高级
        
        # 计算工作年限统计信息
        work_years_stats = {
            "平均工作年限": round(self.df[work_years_col].mean(), 1),
            "中位工作年限": round(self.df[work_years_col].median(), 1),
            "最长工作年限": int(self.df[work_years_col].max()),
            "初级员工比例": round(junior_count / total * 100) if total > 0 else 0,  # 新增：3年以下员工比例
            "中级员工比例": round(mid_count / total * 100) if total > 0 else 0,  # 新增：3-10年员工比例
            "资深员工比例": round(senior_count / total * 100) if total > 0 else 0,  # 新增：10年以上员工比例
            "经验结构评分": self._calculate_experience_score(self.df[work_years_col]),  # 新增：经验结构评分
            "经验多样性指数": round(1 - sum((count/total)**2 for count in work_years_counts), 2) if total > 0 else 0  # 新增：经验多样性指数
        }
        
        return {
            "title": "工作年限分布",
            "description": "员工工作年限分布情况",
            "xAxis": work_years_counts.index.tolist(),
            "yAxis": work_years_counts.values.tolist(),
            "data": {str(year): int(count) for year, count in work_years_counts.items()},
            "stats": work_years_stats
        }
        
    def _calculate_experience_score(self, work_years_series):
        """计算经验结构评分（满分100）"""
        if work_years_series.empty:
            return 0
            
        # 计算各经验段比例
        total = len(work_years_series)
        if total == 0:
            return 0
            
        junior = len(work_years_series[work_years_series < 3]) / total
        mid = len(work_years_series[(work_years_series >= 3) & (work_years_series < 10)]) / total
        senior = len(work_years_series[work_years_series >= 10]) / total
        
        # 理想的经验结构比例（可根据行业特点调整）
        # 初级:中级:高级 = 3:5:2
        ideal_junior = 0.3
        ideal_mid = 0.5
        ideal_senior = 0.2
        
        # 计算与理想结构的偏差（越小越好）
        deviation = abs(junior - ideal_junior) + abs(mid - ideal_mid) + abs(senior - ideal_senior)
        
        # 转换为分数（满分100）
        score = 100 * (1 - deviation / 2)  # 最大偏差为2，归一化
        return round(max(0, min(100, score)), 0)  # 确保分数在0-100之间
    
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
            print(f"无法获取员工列表：数据为空")
            return []
            
        print(f"获取{visualization_type}类型下的{category}分类员工列表")
        print(f"数据框列名: {list(self.df.columns)}")
            
        # 根据不同的可视化类型，应用不同的筛选条件
        if visualization_type == 'age':
            # 年龄分布
            if 'age' not in self.df.columns:
                print(f"无法获取年龄数据：'age'列不存在")
                return []
                
            age_bins = [0, 25, 30, 35, 40, 45, 50, 100]
            age_labels = ['25岁以下', '26-30岁', '31-35岁', '36-40岁', '41-45岁', '46-50岁', '50岁以上']
            
            # 找到对应的年龄范围
            if category not in age_labels:
                print(f"无效的年龄分类: {category}")
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
                print(f"无法获取部门数据：'department'列不存在")
                return []
                
            print(f"筛选部门: {category}")
            print(f"可用部门: {self.df['department'].unique()}")
            filtered_df = self.df[self.df['department'] == category]
            
        elif visualization_type == 'gender':
            # 性别分布
            if 'gender' not in self.df.columns:
                print(f"无法获取性别数据：'gender'列不存在")
                return []
                
            filtered_df = self.df[self.df['gender'] == category]
            
        elif visualization_type == 'education':
            # 学历分布
            edu_column = 'education_level' if 'education_level' in self.df.columns else 'education'
            if edu_column not in self.df.columns:
                print(f"无法获取学历数据：'{edu_column}'列不存在")
                return []
                
            print(f"筛选学历: {category}")
            print(f"可用学历: {self.df[edu_column].unique()}")
            filtered_df = self.df[self.df[edu_column] == category]
            
        elif visualization_type == 'university':
            # 高校分布
            if 'university' not in self.df.columns:
                print(f"无法获取高校数据：'university'列不存在")
                return []
                
            filtered_df = self.df[self.df['university'] == category]
            
        elif visualization_type == 'work_years':
            # 工作年限分布
            work_years_column = None
            if 'total_work_years' in self.df.columns:
                work_years_column = 'total_work_years'
            elif 'company_years' in self.df.columns:
                work_years_column = 'company_years'
            
            if not work_years_column:
                print(f"无法获取工作年限数据：相关列不存在")
                return []
                
            work_bins = [0, 3, 5, 10, 15, 20, 100]
            work_labels = ['3年以下', '3-5年', '5-10年', '10-15年', '15-20年', '20年以上']
            
            # 找到对应的工作年限范围
            if category not in work_labels:
                print(f"无效的工作年限分类: {category}")
                raise ValueError(f"无效的工作年限分类: {category}")
                
            idx = work_labels.index(category)
            min_years = work_bins[idx]
            max_years = work_bins[idx + 1]
            
            # 筛选符合条件的员工
            if idx == len(work_labels) - 1:  # 最后一个分类
                filtered_df = self.df[(self.df[work_years_column] >= min_years)]
            else:
                filtered_df = self.df[(self.df[work_years_column] >= min_years) & (self.df[work_years_column] < max_years)]
        else:
            print(f"不支持的可视化类型: {visualization_type}")
            raise ValueError(f"不支持的可视化类型: {visualization_type}")
        
        # 打印筛选结果
        print(f"筛选结果: 找到{len(filtered_df)}条记录")
            
        # 选择需要返回的列
        result_columns = ['id', 'name', 'gender', 'age', 'department', 'position']
        available_columns = [col for col in result_columns if col in filtered_df.columns]
        
        # 转换为字典列表
        result = filtered_df[available_columns].to_dict('records')
        
        # 限制返回数量，避免数据过大
        return result[:100]

# 创建全局可视化服务实例
visualization_service = VisualizationService() 