from supabase import create_client
import json
import os

# 从.env文件读取Supabase配置
def read_env_file(file_path):
    env_vars = {}
    try:
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    env_vars[key] = value
        return env_vars
    except Exception as e:
        print(f"读取.env文件失败: {str(e)}")
        return {}

# 读取.env文件
env_vars = read_env_file('.env')

# 获取Supabase配置
supabase_url = env_vars.get('SUPABASE_URL')
supabase_key = env_vars.get('SUPABASE_KEY')

if not supabase_url or not supabase_key:
    print("未找到Supabase配置，请确保.env文件中包含SUPABASE_URL和SUPABASE_KEY")
    exit(1)

print(f'连接Supabase数据库...')
print(f'URL: {supabase_url}')
print(f'Key: {supabase_key[:10]}...')

try:
    # 创建Supabase客户端
    client = create_client(supabase_url, supabase_key)
    print('Supabase客户端创建成功')
    
    # 获取表结构信息
    print('获取表结构信息...')
    tables = ['employees', 'education', 'work_experience', 'job_changes', 'promotions', 'awards', 'departments']
    
    for table in tables:
        try:
            print(f'\n尝试查询{table}表...')
            response = client.table(table).select('*').limit(1).execute()
            if hasattr(response, 'data') and response.data:
                print(f'{table}表字段:')
                for key in response.data[0].keys():
                    print(f'  - {key}')
                print(f'示例数据: {json.dumps(response.data[0], ensure_ascii=False, indent=2)}')
            else:
                print(f'{table}表无数据')
        except Exception as e:
            print(f'{table}表查询失败: {str(e)}')
    
except Exception as e:
    print(f'连接Supabase失败: {str(e)}') 