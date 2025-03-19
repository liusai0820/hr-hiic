from supabase import create_client
from app.core.config import settings
import pandas as pd
from typing import Dict, List, Any, Optional
import os
import json
import numpy as np
import re

class SupabaseClient:
    """Supabase客户端封装类"""
    
    def __init__(self):
        """初始化Supabase客户端"""
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_KEY
        self.table = settings.SUPABASE_TABLE
        self.client = None
        
        # 初始化Supabase客户端
        if self.url and self.key:
            try:
                self.client = create_client(self.url, self.key)
                print(f"Supabase客户端初始化成功，URL: {self.url[:20]}...")
            except Exception as e:
                print(f"Supabase客户端初始化失败: {str(e)}")
        else:
            print("警告: 未提供Supabase URL或密钥，将使用示例数据")
        
        # 加载示例数据作为备份
        self.data_path = os.path.join(os.path.dirname(__file__), 'sample_data')
        self.sample_employees = self._load_sample_data('employees.json')
        self.sample_departments = self._load_sample_data('departments.json')
        self.sample_attendance = self._load_sample_data('attendance.json')
        self.sample_performance = self._load_sample_data('performance.json')
        self.sample_training = self._load_sample_data('training.json')
        
        # 缓存从真实数据库获取的数据
        self.employees_cache = None
        self.departments_cache = None
        self.attendance_cache = None
        self.performance_cache = None
        self.training_cache = None
        
        # 尝试从真实数据库加载数据
        self._init_cache()
    
    def _init_cache(self):
        """初始化数据缓存"""
        try:
            if self.client:
                print("尝试从Supabase加载真实数据...")
                
                # 获取hr_data表数据
                self.hr_data_cache = self._fetch_hr_data()
                
                if self.hr_data_cache:
                    print(f"成功从Supabase加载{len(self.hr_data_cache)}条HR数据记录")
                    
                    # 将hr_data数据映射到employees结构
                    self.employees_cache = self._map_hr_data_to_employees()
                    if self.employees_cache:
                        print(f"成功将{len(self.employees_cache)}条HR数据映射为员工数据")
                else:
                    print("从Supabase加载HR数据失败，将使用示例数据")
        except Exception as e:
            print(f"初始化数据缓存失败: {str(e)}")
    
    def _fetch_hr_data(self) -> List[Dict[str, Any]]:
        """从Supabase获取hr_data表数据"""
        try:
            if not self.client:
                return None
            
            response = self.client.table('hr_data').select('*').execute()
            if hasattr(response, 'data'):
                print(f"从Supabase获取到{len(response.data)}条hr_data记录")
                return response.data
            return None
        except Exception as e:
            print(f"获取hr_data数据失败: {str(e)}")
            return None
    
    def _map_hr_data_to_employees(self) -> List[Dict[str, Any]]:
        """将hr_data数据映射到employees结构"""
        if not self.hr_data_cache:
            return None
        
        try:
            employees = []
            for hr_record in self.hr_data_cache:
                # 创建员工记录
                employee = {
                    'id': str(hr_record.get('id')),
                    'name': hr_record.get('name'),
                    'gender': hr_record.get('gender_normalized') or hr_record.get('gender'),
                    'age': hr_record.get('current_age') or hr_record.get('age'),
                    'department_id': '0',  # 使用默认值，后续可以根据department字段映射
                    'position': hr_record.get('position'),
                    'salary': None,  # hr_data中可能没有薪资信息
                    'hire_date': hr_record.get('hire_date'),
                    'education': hr_record.get('education_normalized') or hr_record.get('education'),
                    'email': None,  # hr_data中可能没有邮箱信息
                    'phone': None   # hr_data中可能没有电话信息
                }
                
                # 根据department字段设置department_id
                department = hr_record.get('department_normalized') or hr_record.get('department')
                if department:
                    # 查找或创建部门ID
                    dept_id = self._get_department_id_by_name(department)
                    employee['department_id'] = dept_id
                
                employees.append(employee)
            
            return employees
        except Exception as e:
            print(f"映射hr_data到employees失败: {str(e)}")
            return None
    
    def _load_sample_data(self, filename: str) -> List[Dict[str, Any]]:
        """加载示例数据"""
        try:
            file_path = os.path.join(self.data_path, filename)
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                print(f"文件不存在: {file_path}")
                return []
        except Exception as e:
            print(f"加载示例数据失败: {str(e)}")
            return []
    
    def _get_department_id_by_name(self, department_name: str) -> str:
        """根据部门名称获取部门ID，如果不存在则创建"""
        # 首先在示例部门数据中查找
        for dept in self.sample_departments:
            if dept.get('name') == department_name:
                return dept.get('id')
        
        # 如果不存在，创建一个新的部门ID
        # 使用现有部门数量+1作为新ID
        new_id = str(len(self.sample_departments) + 1)
        
        # 创建新部门
        new_dept = {
            'id': new_id,
            'name': department_name,
            'manager_id': None,
            'description': f'从hr_data表导入的{department_name}'
        }
        
        # 添加到示例部门列表
        self.sample_departments.append(new_dept)
        
        return new_id
    
    def get_connection(self):
        """获取Supabase连接"""
        if not self.client:
            try:
                self.client = create_client(self.url, self.key)
            except Exception as e:
                print(f"创建Supabase连接失败: {str(e)}")
        return self.client
    
    def get_all_employees(self) -> List[Dict[str, Any]]:
        """获取所有员工信息"""
        try:
            if self.client:
                print("从Supabase获取员工数据...")
                response = self.client.table(settings.SUPABASE_TABLE).select('*').execute()
                if hasattr(response, 'data') and response.data:
                    print(f"成功获取{len(response.data)}条员工记录")
                    # 确保ID是字符串类型，并添加name字段
                    for employee in response.data:
                        if 'id' in employee:
                            employee['id'] = str(employee['id'])
                        # 确保name字段存在
                        if 'name' not in employee and '姓名' in employee:
                            employee['name'] = employee['姓名']
                        elif '姓名' not in employee and 'name' in employee:
                            employee['姓名'] = employee['name']
                    return response.data
                else:
                    print("从Supabase获取员工数据失败，使用示例数据")
            else:
                print("Supabase客户端未初始化，使用示例数据")
        except Exception as e:
            print(f"获取员工数据异常: {str(e)}")
        
        print("使用示例员工数据")
        # 确保示例数据中的ID是字符串类型，并添加name字段
        for employee in self.sample_employees:
            if 'id' in employee:
                employee['id'] = str(employee['id'])
            # 确保name字段存在
            if 'name' not in employee and '姓名' in employee:
                employee['name'] = employee['姓名']
            elif '姓名' not in employee and 'name' in employee:
                employee['姓名'] = employee['name']
        return self.sample_employees
    
    def get_all_education(self) -> List[Dict[str, Any]]:
        """获取所有教育信息"""
        try:
            if self.client:
                print("从Supabase获取教育数据...")
                response = self.client.table('education').select('*').execute()
                if hasattr(response, 'data') and response.data:
                    print(f"成功获取{len(response.data)}条教育记录")
                    return response.data
                else:
                    print("从Supabase获取教育数据失败")
            else:
                print("Supabase客户端未初始化")
        except Exception as e:
            print(f"获取教育数据异常: {str(e)}")
        
        return []
    
    def get_all_work_experience(self) -> List[Dict[str, Any]]:
        """获取所有工作经验信息"""
        try:
            if self.client:
                print("从Supabase获取工作经验数据...")
                response = self.client.table('work_experience').select('*').execute()
                if hasattr(response, 'data') and response.data:
                    print(f"成功获取{len(response.data)}条工作经验记录")
                    return response.data
                else:
                    print("从Supabase获取工作经验数据失败")
            else:
                print("Supabase客户端未初始化")
        except Exception as e:
            print(f"获取工作经验数据异常: {str(e)}")
        
        return []
    
    def get_employee_by_id(self, employee_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取员工信息，并整合教育、工作经验等相关数据"""
        try:
            if not self.client:
                print("Supabase客户端未初始化，使用示例数据")
                employee = next((e for e in self.sample_employees if str(e.get('id')) == str(employee_id)), None)
                if employee:
                    # 确保ID是字符串类型
                    if 'id' in employee:
                        employee['id'] = str(employee['id'])
                    # 确保name字段存在
                    if 'name' not in employee and '姓名' in employee:
                        employee['name'] = employee['姓名']
                    elif '姓名' not in employee and 'name' in employee:
                        employee['姓名'] = employee['name']
                return employee
            
            print(f"从Supabase获取员工ID={employee_id}的详细信息...")
            
            # 1. 获取基本员工信息
            employee_response = self.client.table('employees').select('*').eq('id', employee_id).execute()
            if not hasattr(employee_response, 'data') or not employee_response.data:
                print(f"未找到ID为{employee_id}的员工")
                return None
            
            # 获取员工基本信息
            employee = employee_response.data[0]
            print(f"成功获取员工基本信息: {employee.get('name', employee.get('姓名', '未知'))}")
            
            # 确保ID是字符串类型
            if 'id' in employee:
                employee['id'] = str(employee['id'])
            # 确保name字段存在
            if 'name' not in employee and '姓名' in employee:
                employee['name'] = employee['姓名']
            elif '姓名' not in employee and 'name' in employee:
                employee['姓名'] = employee['name']
            
            # 2. 获取教育信息
            try:
                education_response = self.client.table('education').select('*').eq('employee_id', employee_id).execute()
                if hasattr(education_response, 'data') and education_response.data:
                    education = education_response.data[0]  # 假设每个员工只有一条教育记录
                    print(f"成功获取员工教育信息")
                    
                    # 将教育信息合并到员工信息中
                    for key, value in education.items():
                        if key != 'id' and key != 'employee_id' and value is not None:
                            employee[key] = value
            except Exception as e:
                print(f"获取员工教育信息失败: {str(e)}")
            
            # 3. 获取工作经验信息
            try:
                work_exp_response = self.client.table('work_experience').select('*').eq('employee_id', employee_id).execute()
                if hasattr(work_exp_response, 'data') and work_exp_response.data:
                    work_exp = work_exp_response.data[0]  # 假设每个员工只有一条工作经验记录
                    print(f"成功获取员工工作经验信息")
                    
                    # 将工作经验信息合并到员工信息中
                    for key, value in work_exp.items():
                        if key != 'id' and key != 'employee_id' and value is not None:
                            employee[key] = value
            except Exception as e:
                print(f"获取员工工作经验信息失败: {str(e)}")
            
            # 4. 获取工作变动信息
            try:
                job_changes_response = self.client.table('job_changes').select('*').eq('employee_id', employee_id).execute()
                if hasattr(job_changes_response, 'data') and job_changes_response.data:
                    job_changes = job_changes_response.data
                    print(f"成功获取员工工作变动信息: {len(job_changes)}条记录")
                    employee['job_change'] = job_changes
            except Exception as e:
                print(f"获取员工工作变动信息失败: {str(e)}")
            
            # 5. 获取晋升信息
            try:
                promotions_response = self.client.table('promotions').select('*').eq('employee_id', employee_id).execute()
                if hasattr(promotions_response, 'data') and promotions_response.data:
                    promotions = promotions_response.data
                    print(f"成功获取员工晋升信息: {len(promotions)}条记录")
                    employee['promotion'] = promotions
            except Exception as e:
                print(f"获取员工晋升信息失败: {str(e)}")
            
            # 6. 获取奖项信息
            try:
                awards_response = self.client.table('awards').select('*').eq('employee_id', employee_id).execute()
                if hasattr(awards_response, 'data') and awards_response.data:
                    awards = awards_response.data
                    print(f"成功获取员工奖项信息: {len(awards)}条记录")
                    employee['awards'] = awards
            except Exception as e:
                print(f"获取员工奖项信息失败: {str(e)}")
            
            print(f"成功整合员工ID={employee_id}的所有信息")
            return employee
            
        except Exception as e:
            print(f"获取员工详细信息时出错: {str(e)}")
            # 如果从真实数据库获取失败，使用示例数据
            return next((e for e in self.sample_employees if e.get('id') == employee_id), None)
    
    def get_employees_by_department(self, department: str) -> List[Dict[str, Any]]:
        """根据部门获取员工数据"""
        try:
            if self.client:
                print(f"从Supabase获取部门'{department}'的员工数据...")
                response = self.client.table('employees').select('*').eq('department', department).execute()
                if hasattr(response, 'data') and response.data:
                    employees = response.data
                    print(f"成功获取部门'{department}'的员工数据: {len(employees)}条记录")
                    
                    # 确保ID是字符串类型，并添加name字段
                    for employee in employees:
                        if 'id' in employee:
                            employee['id'] = str(employee['id'])
                        # 确保name字段存在
                        if 'name' not in employee and '姓名' in employee:
                            employee['name'] = employee['姓名']
                        elif '姓名' not in employee and 'name' in employee:
                            employee['姓名'] = employee['name']
                    
                    return employees
                else:
                    print(f"未找到部门'{department}'的员工数据")
                    return []
            else:
                print("Supabase客户端未初始化，使用示例数据")
                # 从示例数据中筛选
                employees = [e for e in self.sample_employees if e.get('department') == department]
                
                # 确保ID是字符串类型，并添加name字段
                for employee in employees:
                    if 'id' in employee:
                        employee['id'] = str(employee['id'])
                    # 确保name字段存在
                    if 'name' not in employee and '姓名' in employee:
                        employee['name'] = employee['姓名']
                    elif '姓名' not in employee and 'name' in employee:
                        employee['姓名'] = employee['name']
                
                return employees
        except Exception as e:
            print(f"获取部门员工数据时出错: {str(e)}")
            return []
    
    def get_employees_as_dataframe(self) -> pd.DataFrame:
        """获取所有员工数据并转换为DataFrame"""
        try:
            print("正在从Supabase获取员工数据...")
            data = self.get_all_employees()
            print(f"获取到{len(data)}条员工记录")
            
            if not data:
                print("警告: 没有获取到任何员工数据")
                return pd.DataFrame()
            
            # 数据清洗函数
            def clean_data(records):
                cleaned_records = []
                for record in records:
                    cleaned_record = {}
                    for key, value in record.items():
                        # 处理嵌套转义字符的字段
                        if key in ['job_change', 'promotion', 'awards'] and isinstance(value, list):
                            try:
                                # 尝试解析并简化复杂的嵌套转义字符
                                cleaned_value = []
                                for item in value:
                                    # 移除多余的转义字符和引号
                                    if isinstance(item, str):
                                        # 简单处理：提取最内层的实际内容
                                        import re
                                        # 尝试提取最内层的实际内容
                                        matches = re.findall(r'\\+"([^\\]+)\\+', item)
                                        if matches:
                                            cleaned_value.append(matches[-1])
                                        else:
                                            # 如果无法提取，则保留原始值
                                            cleaned_value.append("数据格式错误")
                                cleaned_record[key] = cleaned_value
                            except Exception as e:
                                print(f"清洗{key}字段时出错: {str(e)}")
                                cleaned_record[key] = ["数据格式错误"]
                        else:
                            cleaned_record[key] = value
                    cleaned_records.append(cleaned_record)
                return cleaned_records
            
            # 清洗数据
            cleaned_data = clean_data(data)
            print("数据清洗完成")
                
            # 打印数据样例，帮助调试
            if cleaned_data:
                print("清洗后数据样例 (第一条记录):")
                for key, value in cleaned_data[0].items():
                    if key in ['job_change', 'promotion', 'awards']:
                        print(f"  {key}: {value}")
                    
            df = pd.DataFrame(cleaned_data)
            print(f"DataFrame创建成功，列名: {list(df.columns)}")
            return df
        except Exception as e:
            import traceback
            print(f"获取员工数据失败: {str(e)}")
            print(f"错误详情: {traceback.format_exc()}")
            return pd.DataFrame()
    
    def get_department_stats(self) -> Dict[str, Any]:
        """获取部门统计信息"""
        try:
            # 直接从数据库获取部门数据
            if self.client:
                print("从Supabase直接获取部门统计数据...")
                try:
                    # 尝试从部门表获取数据
                    response = self.client.table('departments').select('name,id').execute()
                    
                    if hasattr(response, 'data') and response.data:
                        departments = response.data
                        print(f"成功获取{len(departments)}个部门")
                        
                        # 获取每个部门的员工数量
                        dept_counts = {}
                        for dept in departments:
                            dept_name = dept.get('name')
                            if dept_name:
                                # 查询该部门的员工数量
                                try:
                                    emp_response = self.client.table('employees').select('id').eq('department', dept_name).execute()
                                    if hasattr(emp_response, 'data'):
                                        count = len(emp_response.data)
                                        dept_counts[dept_name] = count
                                        print(f"部门 '{dept_name}' 有 {count} 名员工")
                                except Exception as e:
                                    print(f"获取部门 '{dept_name}' 员工数量失败: {str(e)}")
                                    dept_counts[dept_name] = 0
                        
                        # 如果没有获取到部门数据，尝试从员工表中提取部门信息
                        if not dept_counts:
                            print("从部门表获取数据失败，尝试从员工表提取部门信息...")
                            emp_response = self.client.table('employees').select('department').execute()
                            if hasattr(emp_response, 'data') and emp_response.data:
                                # 统计每个部门的员工数量
                                for emp in emp_response.data:
                                    dept_name = emp.get('department')
                                    if dept_name:
                                        dept_counts[dept_name] = dept_counts.get(dept_name, 0) + 1
                                
                                print(f"从员工表提取了 {len(dept_counts)} 个部门")
                        
                        # 获取总员工数
                        try:
                            emp_count_response = self.client.table('employees').select('id').execute()
                            total_employees = len(emp_count_response.data) if hasattr(emp_count_response, 'data') else 0
                        except Exception as e:
                            print(f"获取总员工数失败: {str(e)}")
                            # 使用部门员工数之和作为总员工数
                            total_employees = sum(dept_counts.values())
                        
                        # 添加总员工数
                        dept_counts['total_employees'] = total_employees
                        
                        return dept_counts
                except Exception as e:
                    print(f"从Supabase获取部门数据失败: {str(e)}")
            
            # 如果从数据库获取失败，尝试从员工数据中提取部门信息
            print("尝试从员工数据中提取部门信息...")
            employees = self.get_all_employees()
            
            # 计算每个部门的员工数量
            dept_counts = {}
            for emp in employees:
                dept_name = emp.get('部门') or emp.get('department')
                if dept_name:
                    dept_counts[dept_name] = dept_counts.get(dept_name, 0) + 1
            
            # 如果仍然没有获取到部门数据，使用示例数据
            if not dept_counts:
                print("未获取到实际部门数据，使用示例数据")
                for dept in self.sample_departments:
                    dept_name = dept.get('name')
                    count = len([e for e in self.sample_employees if e.get('department_id') == dept.get('id')])
                    dept_counts[dept_name] = count
            
            # 添加总员工数
            dept_counts['total_employees'] = len(employees) if employees else len(self.sample_employees)
            
            return dept_counts
        except Exception as e:
            print(f"获取部门统计信息失败: {str(e)}")
            # 出错时返回示例数据
            dept_counts = {}
            for dept in self.sample_departments:
                dept_name = dept.get('name')
                dept_counts[dept_name] = 0
            dept_counts['total_employees'] = 0
            return dept_counts
    
    def get_gender_stats(self) -> Dict[str, int]:
        """获取性别统计信息"""
        gender_counts = {}
        for emp in self.sample_employees:
            gender = emp.get('gender', '未知')
            gender_counts[gender] = gender_counts.get(gender, 0) + 1
        
        return gender_counts
    
    def get_age_stats(self) -> Dict[str, Any]:
        """获取年龄统计信息"""
        ages = [emp.get('age', 0) for emp in self.sample_employees if emp.get('age', 0) > 0]
        
        if not ages:
            return {'count': 0}
        
        return {
            'count': len(ages),
            'min': min(ages),
            'max': max(ages),
            'mean': sum(ages) / len(ages),
            'median': sorted(ages)[len(ages) // 2]
        }
    
    def get_education_stats(self) -> Dict[str, int]:
        """获取学历统计信息"""
        education_counts = {}
        for emp in self.sample_employees:
            education = emp.get('education', '未知')
            education_counts[education] = education_counts.get(education, 0) + 1
        
        return education_counts
    
    def execute_query(self, query: str) -> List[Dict[str, Any]]:
        """执行自定义查询"""
        # 注意：这里需要根据实际情况实现，可能需要使用PostgreSQL连接
        # 这里只是一个示例，实际上Supabase的Python客户端不直接支持原始SQL查询
        # 可以考虑使用SQLAlchemy或psycopg2直接连接PostgreSQL
        raise NotImplementedError("自定义查询功能尚未实现")
    
    # 用户管理相关方法
    def get_pending_users(self) -> List[Dict[str, Any]]:
        """获取待审批用户列表"""
        try:
            # 使用管理员API获取用户列表
            response = self.get_connection().auth.admin.list_users()
            
            # 过滤出未审批的用户
            pending_users = []
            for user in response:
                # 检查用户元数据中的approved字段
                if user.user_metadata and not user.user_metadata.get('approved', False):
                    pending_users.append({
                        'id': user.id,
                        'email': user.email,
                        'approved': False,
                        'role': user.user_metadata.get('role', 'user'),
                        'created_at': user.created_at
                    })
            
            return pending_users
        except Exception as e:
            print(f"获取待审批用户列表失败: {str(e)}")
            raise e
    
    def update_user_approval(self, user_id: str, approved: bool) -> bool:
        """更新用户审批状态"""
        try:
            # 获取用户当前元数据
            user_response = self.get_connection().auth.admin.get_user_by_id(user_id)
            
            if not user_response:
                raise ValueError(f"未找到ID为{user_id}的用户")
            
            # 更新用户元数据
            current_metadata = user_response.user_metadata or {}
            current_metadata['approved'] = approved
            
            # 使用管理员API更新用户元数据
            update_response = self.get_connection().auth.admin.update_user_by_id(
                user_id,
                {'user_metadata': current_metadata}
            )
            
            return True
        except Exception as e:
            print(f"更新用户审批状态失败: {str(e)}")
            raise e
    
    def get_all_users(self) -> List[Dict[str, Any]]:
        """获取所有用户列表"""
        try:
            # 使用管理员API获取用户列表
            response = self.get_connection().auth.admin.list_users()
            
            # 格式化用户数据
            users = []
            for user in response:
                users.append({
                    'id': user.id,
                    'email': user.email,
                    'approved': user.user_metadata.get('approved', False) if user.user_metadata else False,
                    'role': user.user_metadata.get('role', 'user') if user.user_metadata else 'user',
                    'created_at': user.created_at
                })
            
            return users
        except Exception as e:
            print(f"获取用户列表失败: {str(e)}")
            raise e
    
    def get_department_employees(self, department_name: str) -> List[Dict[str, Any]]:
        """获取指定部门的员工信息"""
        # 查找部门ID
        dept = next((d for d in self.sample_departments if d.get('name') == department_name), None)
        if not dept:
            return []
        
        # 查找该部门的员工
        return [e for e in self.sample_employees if e.get('department_id') == dept.get('id')]
    
    def get_department_info(self, department_name: str) -> Optional[Dict[str, Any]]:
        """获取部门信息"""
        return next((d for d in self.sample_departments if d.get('name') == department_name), None)
    
    def get_department_by_id(self, department_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取部门信息"""
        return next((d for d in self.sample_departments if d.get('id') == department_id), None)
    
    def find_employee_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """根据姓名查找员工"""
        return next((e for e in self.sample_employees if e.get('name') == name), None)
    
    def get_employee_performance(self, employee_id: str) -> List[Dict[str, Any]]:
        """获取员工绩效信息"""
        return [p for p in self.sample_performance if p.get('employee_id') == employee_id]
    
    def get_employee_attendance(self, employee_id: str) -> List[Dict[str, Any]]:
        """获取员工考勤信息"""
        return [a for a in self.sample_attendance if a.get('employee_id') == employee_id]
    
    def execute_sql(self, sql_query: str) -> List[Dict[str, Any]]:
        """执行SQL查询"""
        # 首先尝试在真实数据库上执行查询
        if self.client:
            try:
                print(f"尝试在Supabase上执行SQL查询: {sql_query[:100]}...")
                
                # 修改SQL查询，将employees替换为hr_data
                modified_query = self._modify_sql_for_hr_data(sql_query)
                print(f"修改后的SQL查询: {modified_query[:100]}...")
                
                # 处理特定年份入职查询
                if 'SUBSTR(hire_date, 1, 4)' in modified_query:
                    print("检测到特定年份入职查询，执行专门的处理逻辑")
                    
                    # 获取查询中的年份
                    year_match = re.search(r"SUBSTR\(hire_date, 1, 4\) = '(\d{4})'", modified_query)
                    if not year_match:
                        print("未能从查询中提取年份")
                        return [{'error': '查询语法错误', 'message': '无法从查询中提取年份信息'}]
                        
                    year = year_match.group(1)
                    print(f"查询{year}年入职的员工")
                    
                    # 尝试多种方式获取入职年份的员工
                    year_employees = []
                    
                    # 方法1: 从employees表中查询
                    try:
                        print("方法1: 从employees表获取所有员工数据并在应用层过滤...")
                        response = self.client.table('employees').select('*').execute()
                        
                        if hasattr(response, 'data') and response.data:
                            for employee in response.data:
                                # 检查多个可能的入职日期字段
                                for date_field in ['hire_date', 'first_work_date', 'join_date']:
                                    date_value = employee.get(date_field, '')
                                    if date_value and isinstance(date_value, str) and len(date_value) >= 4:
                                        date_year = date_value[:4]
                                        if date_year == year:
                                            # 只保留查询需要的字段
                                            filtered_employee = {'name': employee.get('name', '')}
                                            if filtered_employee not in year_employees:
                                                year_employees.append(filtered_employee)
                                            break
                            
                            print(f"方法1找到{len(year_employees)}名{year}年入职的员工")
                    except Exception as e:
                        print(f"方法1失败: {str(e)}")
                    
                    # 方法2: 如果方法1没有找到员工，尝试从work_experience表查询
                    if not year_employees:
                        try:
                            print("方法2: 从work_experience表查询...")
                            query = self.client.table('work_experience').select('employee_id,hire_date').execute()
                            
                            if hasattr(query, 'data') and query.data:
                                emp_ids = []
                                for record in query.data:
                                    hire_date = record.get('hire_date', '')
                                    if hire_date and isinstance(hire_date, str) and len(hire_date) >= 4:
                                        hire_year = hire_date[:4]
                                        if hire_year == year:
                                            emp_ids.append(record.get('employee_id'))
                                
                                # 获取这些员工的姓名
                                if emp_ids:
                                    for emp_id in emp_ids:
                                        name_query = self.client.table('employees').select('name').eq('id', emp_id).execute()
                                        if hasattr(name_query, 'data') and name_query.data:
                                            year_employees.append({'name': name_query.data[0].get('name', '')})
                                
                                print(f"方法2找到{len(year_employees)}名{year}年入职的员工")
                        except Exception as e:
                            print(f"方法2失败: {str(e)}")
                    
                    # 方法3: 如果前两种方法都没找到，尝试从缓存数据中查询
                    if not year_employees:
                        try:
                            print("方法3: 从内存缓存中查询...")
                            all_employees = self.get_all_employees()
                            
                            for employee in all_employees:
                                for date_field in ['hire_date', 'first_work_date', 'join_date', 'created_at']:
                                    date_value = employee.get(date_field, '')
                                    if date_value and isinstance(date_value, str) and len(date_value) >= 4:
                                        year_value = date_value[:4]
                                        if year_value == year:
                                            year_employees.append({'name': employee.get('name', '')})
                                            break
                            
                            print(f"方法3找到{len(year_employees)}名{year}年入职的员工")
                        except Exception as e:
                            print(f"方法3失败: {str(e)}")
                    
                    # 如果指定了ORDER BY，进行排序
                    if 'ORDER BY name' in modified_query:
                        year_employees.sort(key=lambda x: x.get('name', ''))
                    
                    # 如果三种方法都没找到员工
                    if not year_employees:
                        print(f"警告: 未能找到{year}年入职的员工")
                        return [{'message': f'未能找到{year}年入职的员工记录'}]
                    
                    return year_employees
                
                # 处理特定类型的查询 - 按部门分组计数
                if ('COUNT' in modified_query.upper() and 
                    'GROUP BY' in modified_query.upper() and 
                    ('DEPARTMENT' in modified_query.upper() or 'department' in modified_query.lower())):
                    print("检测到按部门分组的统计查询，执行专门的处理逻辑")
                    try:
                        # 直接从Supabase获取所有部门数据
                        print("从Supabase直接获取部门统计数据...")
                        response = self.client.table('employees').select('department').execute()
                        
                        if hasattr(response, 'data') and response.data:
                            # 按部门对员工进行分组计数
                            dept_counts = {}
                            for record in response.data:
                                dept = record.get('department', '未知部门')
                                if dept and dept.strip():  # 确保部门名不为空
                                    dept_counts[dept] = dept_counts.get(dept, 0) + 1
                            
                            print(f"成功获取{len(dept_counts)}个部门")
                            
                            # 转换为结果列表
                            result = []
                            for dept, count in dept_counts.items():
                                print(f"部门 '{dept}' 有 {count} 名员工")
                                result.append({'department': dept, 'count': count})
                            
                            # 排序（按数量降序排序）
                            if 'ORDER BY' in modified_query.upper() and 'DESC' in modified_query.upper():
                                result.sort(key=lambda x: x['count'], reverse=True)
                            elif 'ORDER BY' in modified_query.upper():
                                result.sort(key=lambda x: x['count'])
                            
                            return result
                    except Exception as e:
                        print(f"获取部门统计数据失败: {str(e)}")
                
                # 尝试直接在employees表上执行查询
                try:
                    # 直接使用select方法查询employees表
                    if 'SELECT' in modified_query.upper() and 'FROM EMPLOYEES' in modified_query.upper():
                        # 提取查询条件
                        where_clause = ""
                        if 'WHERE' in modified_query.upper():
                            where_clause = modified_query.upper().split('WHERE')[1].strip()
                            if 'ORDER BY' in where_clause:
                                where_clause = where_clause.split('ORDER BY')[0].strip()
                            if 'LIMIT' in where_clause:
                                where_clause = where_clause.split('LIMIT')[0].strip()
                        
                        print("简化查询逻辑，直接获取所有员工并按条件筛选")
                        
                        # 如果是查询男性员工数量，直接获取所有男性员工
                        if 'GENDER' in modified_query.upper() and '男' in modified_query:
                            try:
                                # 获取所有男性员工
                                print("获取所有男性员工...")
                                response = self.client.table('employees').select('*').eq('gender', '男').execute()
                                
                                if hasattr(response, 'data'):
                                    male_employees = response.data
                                    print(f"获取到{len(male_employees)}名男性员工")
                                    
                                    # 如果是按部门分组查询男性员工数量
                                    if 'GROUP BY' in modified_query.upper() and 'DEPARTMENT' in modified_query.upper():
                                        # 按部门统计男性员工数量
                                        dept_counts = {}
                                        for record in male_employees:
                                            # 使用department字段
                                            dept = record.get('department', '未知部门')
                                            dept_counts[dept] = dept_counts.get(dept, 0) + 1
                                        
                                        print(f"按部门统计的男性员工数量: {dept_counts}")
                                        
                                        # 转换为结果列表
                                        result = []
                                        for dept, count in dept_counts.items():
                                            result.append({'department': dept, 'male_count': count})
                                        
                                        # 排序（按数量降序排序）
                                        result.sort(key=lambda x: x['male_count'], reverse=True)
                                        
                                        if result:
                                            print(f"男性员工最多的部门是: {result[0]['department']}，共有{result[0]['male_count']}人")
                                        
                                        return result
                                    
                                    # 如果只是查询男性员工总数
                                    if 'COUNT' in modified_query.upper():
                                        male_count = len(male_employees)
                                        print(f"男性员工总数: {male_count}")
                                        return [{'count': male_count}]
                                    
                                    # 返回所有男性员工数据
                                    return male_employees
                            except Exception as e:
                                print(f"获取男性员工数据失败: {str(e)}")
                        
                        # 其他类型的查询，尝试直接执行
                        try:
                            query = self.client.table('employees').select('*')
                            response = query.execute()
                            
                            if hasattr(response, 'data'):
                                print(f"查询成功，返回{len(response.data)}条记录")
                                return response.data
                        except Exception as e:
                            print(f"执行查询失败: {str(e)}")
                except Exception as e:
                    print(f"直接查询employees表失败: {str(e)}")
            except Exception as e:
                print(f"在Supabase上执行SQL查询失败: {str(e)}")
                print("将使用本地数据执行查询")
        
        # 如果在真实数据库上执行失败，使用本地数据
        try:
            # 创建数据帧
            employees_data = self.get_all_employees()
            departments_data = self.sample_departments  # 使用示例部门数据
            attendance_data = self.sample_attendance    # 使用示例考勤数据
            performance_data = self.sample_performance  # 使用示例绩效数据
            training_data = self.sample_training        # 使用示例培训数据
            
            df_employees = pd.DataFrame(employees_data)
            df_departments = pd.DataFrame(departments_data)
            df_attendance = pd.DataFrame(attendance_data)
            df_performance = pd.DataFrame(performance_data)
            df_training = pd.DataFrame(training_data)
            
            # 创建临时变量，使数据帧可以在eval中访问
            locals_dict = {
                'employees': df_employees,
                'departments': df_departments,
                'attendance': df_attendance,
                'performance': df_performance,
                'training': df_training,
                'pd': pd,
                'np': np
            }
            
            # 解析SQL查询（这是一个简化的实现，实际应该使用SQL解析器）
            # 这里我们假设查询是pandas兼容的代码
            if 'SELECT' in sql_query.upper():
                # 将SQL转换为pandas代码（非常简化的实现）
                pandas_code = self._sql_to_pandas(sql_query)
                print(f"转换后的pandas代码: {pandas_code}")
                
                # 执行pandas代码
                result_df = eval(pandas_code, globals(), locals_dict)
                
                # 转换为字典列表
                if isinstance(result_df, pd.DataFrame):
                    # 处理NaN值
                    result_df = result_df.replace({np.nan: None})
                    return result_df.to_dict('records')
                elif isinstance(result_df, pd.Series):
                    return [{'result': result_df.to_dict()}]
                else:
                    return [{'result': result_df}]
            else:
                raise ValueError("仅支持SELECT查询")
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"执行SQL查询失败: {str(e)}")
            print(f"错误详情: {error_trace}")
            # 返回明确的错误信息，而不是空列表
            return [{'error': str(e), 'message': '查询执行失败，无法提供准确数据。请检查数据库连接或查询语法。'}]
    
    def _modify_sql_for_hr_data(self, sql_query: str) -> str:
        """修改SQL查询，适配当前的表结构"""
        # 不再替换表名，因为现在直接使用employees表
        modified_query = sql_query
        
        # 替换列名（根据需要添加更多映射）
        column_mappings = {
            'e.gender': 'employees.gender',
            'e.department_id': 'employees.department_id',
            'd.name': 'departments.name'
        }
        
        for old_col, new_col in column_mappings.items():
            modified_query = modified_query.replace(old_col, new_col)
        
        print(f"修改后的SQL查询: {modified_query}")
        return modified_query

    def _sql_to_pandas(self, sql_query: str) -> str:
        """将SQL查询转换为pandas代码（简化实现）"""
        # 这是一个非常简化的实现，仅支持基本的SELECT查询
        # 实际应用中应该使用专业的SQL解析器
        
        sql = sql_query.strip().upper()
        print(f"尝试将SQL转换为Pandas代码: {sql}")
        
        # 特殊处理：按部门统计男性员工数量
        if 'COUNT' in sql and 'GENDER' in sql and '男' in sql and 'GROUP BY' in sql and 'DEPARTMENT' in sql:
            print("检测到按部门统计男性员工数量的查询")
            return """
# 按部门统计男性员工数量
male_employees = employees[employees['gender'] == '男']
dept_counts = male_employees.groupby('department_id').size().reset_index(name='count')
# 添加部门名称
dept_counts = pd.merge(dept_counts, departments, left_on='department_id', right_on='id')
# 选择需要的列并排序
result = dept_counts[['name', 'count']].rename(columns={'name': 'department'})
result = result.sort_values('count', ascending=False)
result
"""
        
        # 特殊处理：查询男性员工总数
        if 'COUNT' in sql and 'GENDER' in sql and '男' in sql and 'FROM EMPLOYEES' in sql:
            print("检测到查询男性员工总数的查询")
            return "len(employees[employees['gender'] == '男'])"
        
        # 处理简单的SELECT查询
        if sql.startswith('SELECT') and 'FROM EMPLOYEES' in sql:
            print("检测到一般的SELECT查询")
            try:
                # 提取SELECT和WHERE部分
                select_part = sql.split('FROM')[0].replace('SELECT', '').strip()
                where_part = sql.split('WHERE')[1].strip() if 'WHERE' in sql else ""
                
                # 处理ORDER BY
                order_part = ""
                if 'ORDER BY' in where_part:
                    parts = where_part.split('ORDER BY')
                    where_part = parts[0].strip()
                    order_part = parts[1].strip()
                elif 'ORDER BY' in sql:
                    parts = sql.split('ORDER BY')
                    order_part = parts[1].strip()
                
                # 处理LIMIT
                limit_part = ""
                if 'LIMIT' in where_part:
                    parts = where_part.split('LIMIT')
                    where_part = parts[0].strip()
                    limit_part = parts[1].strip()
                elif 'LIMIT' in order_part:
                    parts = order_part.split('LIMIT')
                    order_part = parts[0].strip()
                    limit_part = parts[1].strip()
                elif 'LIMIT' in sql:
                    parts = sql.split('LIMIT')
                    limit_part = parts[1].strip()
                
                # 构建pandas代码
                code = "employees"
                
                # 添加WHERE条件
                if where_part:
                    # 替换SQL操作符为Python操作符
                    where_part = where_part.replace('=', '==').replace('<>', '!=')
                    where_part = where_part.replace("'男'", "'男'")  # 确保中文字符正确
                    code += f"[{where_part}]"
                
                # 添加SELECT列
                if select_part != '*':
                    columns = [col.strip() for col in select_part.split(',')]
                    quoted_columns = ["'" + col + "'" for col in columns]
                    code += f"[[{', '.join(quoted_columns)}]]"
                
                # 添加ORDER BY
                if order_part:
                    # 简化处理，假设只有一个排序列
                    asc = 'ASC' in order_part
                    col = order_part.replace('ASC', '').replace('DESC', '').strip()
                    code += f".sort_values(by='{col}', ascending={str(asc).lower()})"
                
                # 添加LIMIT
                if limit_part:
                    limit_part = limit_part.replace(';', '')  # 移除可能的分号
                    code += f".head({limit_part})"
                
                print(f"转换后的Pandas代码: {code}")
                return code
            except Exception as e:
                print(f"转换SQL到Pandas代码失败: {str(e)}")
                raise ValueError(f"无法解析SQL查询: {sql_query}")
        
        # 如果无法解析，返回原始SQL作为错误信息
        raise ValueError(f"无法解析SQL查询: {sql_query}")

    def get_employee_details_by_id(self, employee_id: str) -> Optional[Dict[str, Any]]:
        """使用employee_details视图获取员工详情"""
        try:
            if not self.client:
                print("Supabase客户端未初始化，使用示例数据")
                return self.get_employee_by_id(employee_id)
            
            print(f"从employee_details视图获取员工ID={employee_id}的详细信息...")
            
            # 从视图中获取基本信息
            response = self.client.table('employee_details').select('*').eq('id', employee_id).execute()
            if not hasattr(response, 'data') or not response.data:
                print(f"在视图中未找到ID为{employee_id}的员工")
                # 尝试使用原始方法获取
                return self.get_employee_by_id(employee_id)
            
            # 获取员工基本信息
            employee = response.data[0]
            print(f"成功从视图获取员工基本信息: {employee.get('name')}")
            
            # 确保id是字符串
            if 'id' in employee:
                employee['id'] = str(employee['id'])
            
            # 确保name和姓名字段都存在
            if 'name' in employee and '姓名' not in employee:
                employee['姓名'] = employee['name']
            elif '姓名' in employee and 'name' not in employee:
                employee['name'] = employee['姓名']
            
            # 获取工作变动、晋升和奖项信息
            # 这些信息仍然需要单独查询，因为它们是一对多关系
            
            # 1. 获取工作变动信息
            try:
                job_changes_response = self.client.table('job_changes').select('*').eq('employee_id', employee_id).execute()
                if hasattr(job_changes_response, 'data') and job_changes_response.data:
                    job_changes = job_changes_response.data
                    print(f"成功获取员工工作变动信息: {len(job_changes)}条记录")
                    employee['job_change'] = job_changes
            except Exception as e:
                print(f"获取员工工作变动信息失败: {str(e)}")
            
            # 2. 获取晋升信息
            try:
                promotions_response = self.client.table('promotions').select('*').eq('employee_id', employee_id).execute()
                if hasattr(promotions_response, 'data') and promotions_response.data:
                    promotions = promotions_response.data
                    print(f"成功获取员工晋升信息: {len(promotions)}条记录")
                    employee['promotion'] = promotions
            except Exception as e:
                print(f"获取员工晋升信息失败: {str(e)}")
            
            # 3. 获取奖项信息
            try:
                awards_response = self.client.table('awards').select('*').eq('employee_id', employee_id).execute()
                if hasattr(awards_response, 'data') and awards_response.data:
                    awards = awards_response.data
                    print(f"成功获取员工奖项信息: {len(awards)}条记录")
                    employee['awards'] = awards
            except Exception as e:
                print(f"获取员工奖项信息失败: {str(e)}")
            
            print(f"成功整合员工ID={employee_id}的所有信息")
            return employee
            
        except Exception as e:
            print(f"从视图获取员工详细信息时出错: {str(e)}")
            # 如果从视图获取失败，尝试使用原始方法
            return self.get_employee_by_id(employee_id)

    def get_employee_details_full_by_id(self, employee_id: str) -> Optional[Dict[str, Any]]:
        """使用employee_details_full视图获取员工完整详情"""
        try:
            if not self.client:
                print("Supabase客户端未初始化，使用示例数据")
                return self.get_employee_by_id(employee_id)
            
            print(f"从employee_details_full视图获取员工ID={employee_id}的完整详情...")
            
            # 从视图中获取基本信息
            response = self.client.table('employee_details_full').select('*').eq('id', employee_id).execute()
            if not hasattr(response, 'data') or not response.data:
                print(f"在视图中未找到ID为{employee_id}的员工")
                # 尝试使用原始方法获取
                return self.get_employee_details_by_id(employee_id)
            
            # 获取员工基本信息
            employee = response.data[0]
            print(f"成功从视图获取员工完整详情: {employee.get('name')}")
            
            # 确保id是字符串
            if 'id' in employee:
                employee['id'] = str(employee['id'])
            
            # 确保name和姓名字段都存在
            if 'name' in employee and '姓名' not in employee:
                employee['姓名'] = employee['name']
            elif '姓名' in employee and 'name' not in employee:
                employee['name'] = employee['姓名']
            
            # 获取工作变动、晋升和奖项信息
            # 这些信息仍然需要单独查询，因为它们是一对多关系
            
            # 1. 获取工作变动信息
            try:
                job_changes_response = self.client.table('job_changes').select('*').eq('employee_id', employee_id).execute()
                if hasattr(job_changes_response, 'data') and job_changes_response.data:
                    job_changes = job_changes_response.data
                    print(f"成功获取员工工作变动信息: {len(job_changes)}条记录")
                    employee['job_change'] = job_changes
            except Exception as e:
                print(f"获取员工工作变动信息失败: {str(e)}")
            
            # 2. 获取晋升信息
            try:
                promotions_response = self.client.table('promotions').select('*').eq('employee_id', employee_id).execute()
                if hasattr(promotions_response, 'data') and promotions_response.data:
                    promotions = promotions_response.data
                    print(f"成功获取员工晋升信息: {len(promotions)}条记录")
                    employee['promotion'] = promotions
            except Exception as e:
                print(f"获取员工晋升信息失败: {str(e)}")
            
            # 3. 获取奖项信息
            try:
                awards_response = self.client.table('awards').select('*').eq('employee_id', employee_id).execute()
                if hasattr(awards_response, 'data') and awards_response.data:
                    awards = awards_response.data
                    print(f"成功获取员工奖项信息: {len(awards)}条记录")
                    employee['awards'] = awards
            except Exception as e:
                print(f"获取员工奖项信息失败: {str(e)}")
            
            print(f"成功整合员工ID={employee_id}的所有信息")
            return employee
            
        except Exception as e:
            print(f"从视图获取员工完整详情时出错: {str(e)}")
            # 如果从视图获取失败，尝试使用原始方法
            return self.get_employee_details_by_id(employee_id)

# 创建全局Supabase客户端实例
supabase_client = SupabaseClient() 