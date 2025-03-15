from supabase import create_client
import os
from dotenv import load_dotenv
import json

# 加载环境变量
load_dotenv()

# 获取Supabase配置
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def main():
    """检查hr_data表的结构和数据"""
    print(f"Supabase URL: {SUPABASE_URL[:20]}...")
    print(f"Supabase Key: {SUPABASE_KEY[:10]}...")
    
    try:
        # 初始化Supabase客户端
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase客户端初始化成功")
        
        # 获取hr_data表的数据
        print("\n尝试获取hr_data表的数据...")
        try:
            response = client.table('hr_data').select('*').limit(5).execute()
            if hasattr(response, 'data') and response.data:
                print(f"\nhr_data表存在，获取到 {len(response.data)} 条记录")
                
                # 打印第一条记录的所有字段
                print("\n第一条记录的字段:")
                for key, value in response.data[0].items():
                    print(f"  - {key}: {value}")
                
                # 检查性别字段
                print("\n检查性别字段:")
                gender_fields = ['gender', 'gender_normalized', 'sex']
                for field in gender_fields:
                    if field in response.data[0]:
                        print(f"  - 字段 '{field}' 存在，值为: {response.data[0][field]}")
                    else:
                        print(f"  - 字段 '{field}' 不存在")
                
                # 检查部门字段
                print("\n检查部门字段:")
                dept_fields = ['department', 'department_normalized', 'dept', 'department_name']
                for field in dept_fields:
                    if field in response.data[0]:
                        print(f"  - 字段 '{field}' 存在，值为: {response.data[0][field]}")
                    else:
                        print(f"  - 字段 '{field}' 不存在")
                
                # 统计男性员工数量
                print("\n统计男性员工数量:")
                male_count = 0
                for record in response.data:
                    gender = record.get('gender', '')
                    if gender == '男' or gender == 'male':
                        male_count += 1
                print(f"  - 前5条记录中的男性员工数量: {male_count}")
                
                # 获取所有男性员工
                print("\n尝试获取所有男性员工...")
                male_response = client.table('hr_data').select('*').eq('gender', '男').execute()
                if hasattr(male_response, 'data'):
                    print(f"  - 使用gender='男'查询到 {len(male_response.data)} 条记录")
                
                # 尝试其他可能的性别值
                other_genders = ['male', 'M', '男性']
                for gender_value in other_genders:
                    try:
                        gender_response = client.table('hr_data').select('*').eq('gender', gender_value).execute()
                        if hasattr(gender_response, 'data'):
                            print(f"  - 使用gender='{gender_value}'查询到 {len(gender_response.data)} 条记录")
                    except Exception as e:
                        print(f"  - 查询gender='{gender_value}'失败: {str(e)}")
            else:
                print("hr_data表可能不存在或无法访问")
        except Exception as e:
            print(f"获取hr_data表失败: {str(e)}")
    
    except Exception as e:
        print(f"Supabase客户端初始化失败: {str(e)}")

if __name__ == "__main__":
    main() 