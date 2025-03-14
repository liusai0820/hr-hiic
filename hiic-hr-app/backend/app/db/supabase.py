from supabase import create_client
from app.core.config import settings
import pandas as pd
from typing import Dict, List, Any, Optional

class SupabaseClient:
    """Supabase客户端封装类"""
    
    def __init__(self):
        """初始化Supabase客户端"""
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_KEY
        self.table = settings.SUPABASE_TABLE
        self.client = None
        
        if self.url and self.key:
            self.client = create_client(self.url, self.key)
    
    def get_connection(self):
        """获取Supabase连接"""
        if not self.client:
            self.client = create_client(self.url, self.key)
        return self.client
    
    def get_all_employees(self) -> List[Dict[str, Any]]:
        """获取所有员工数据"""
        response = self.get_connection().table(self.table).select('*').execute()
        return response.data
    
    def get_employee_by_id(self, employee_id: int) -> Optional[Dict[str, Any]]:
        """根据ID获取员工数据"""
        response = self.get_connection().table(self.table).select('*').eq('id', employee_id).execute()
        if response.data:
            return response.data[0]
        return None
    
    def get_employees_by_department(self, department: str) -> List[Dict[str, Any]]:
        """根据部门获取员工数据"""
        response = self.get_connection().table(self.table).select('*').eq('department', department).execute()
        return response.data
    
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
    
    def get_department_stats(self) -> Dict[str, int]:
        """获取部门统计信息"""
        df = self.get_employees_as_dataframe()
        if 'department' in df.columns:
            return df['department'].value_counts().to_dict()
        return {}
    
    def get_gender_stats(self) -> Dict[str, int]:
        """获取性别统计信息"""
        df = self.get_employees_as_dataframe()
        if 'gender' in df.columns:
            return df['gender'].value_counts().to_dict()
        return {}
    
    def get_age_stats(self) -> Dict[str, Any]:
        """获取年龄统计信息"""
        df = self.get_employees_as_dataframe()
        if 'age' in df.columns:
            return {
                'mean': float(df['age'].mean()),
                'median': float(df['age'].median()),
                'min': float(df['age'].min()),
                'max': float(df['age'].max()),
                'std': float(df['age'].std())
            }
        return {}
    
    def get_education_stats(self) -> Dict[str, int]:
        """获取学历统计信息"""
        df = self.get_employees_as_dataframe()
        if 'education' in df.columns:
            return df['education'].value_counts().to_dict()
        return {}
    
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

# 创建全局Supabase客户端实例
supabase_client = SupabaseClient() 