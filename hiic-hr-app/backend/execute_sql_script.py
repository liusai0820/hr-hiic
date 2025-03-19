import requests
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

# 读取SQL脚本文件
def read_sql_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"读取SQL文件失败: {str(e)}")
        return None

# 读取.env文件
env_vars = read_env_file('.env')

# 获取Supabase配置
supabase_url = env_vars.get('SUPABASE_URL')
supabase_key = env_vars.get('SUPABASE_KEY')

if not supabase_url or not supabase_key:
    print("未找到Supabase配置，请确保.env文件中包含SUPABASE_URL和SUPABASE_KEY")
    exit(1)

print(f'准备连接Supabase数据库...')
print(f'URL: {supabase_url}')
print(f'Key: {supabase_key[:10]}...')

try:
    # 读取SQL脚本
    sql_script = read_sql_file('create_employee_details_full_view.sql')
    if not sql_script:
        print("SQL脚本为空，请检查文件路径")
        exit(1)
    
    print("SQL脚本内容:")
    print(sql_script)
    
    print("\n注意：由于Supabase API限制，无法直接通过API执行CREATE VIEW语句。")
    print("请按照以下步骤手动执行SQL脚本：")
    print("1. 登录Supabase管理控制台: https://app.supabase.io")
    print("2. 选择您的项目")
    print("3. 点击左侧菜单中的'SQL编辑器'")
    print("4. 创建一个新的查询")
    print("5. 复制以下SQL脚本并粘贴到查询编辑器中")
    print("6. 点击'运行'按钮执行SQL脚本")
    print("\n以下是SQL脚本内容，可以复制使用：")
    print("=" * 80)
    print(sql_script)
    print("=" * 80)
    
    # 提示用户确认是否已手动执行SQL脚本
    confirmation = input("\n您是否已经在Supabase SQL编辑器中执行了上述SQL脚本？(y/n): ")
    if confirmation.lower() != 'y':
        print("请先在Supabase SQL编辑器中执行SQL脚本，然后再运行此程序")
        exit(0)
    
    # 使用Supabase REST API验证视图是否创建成功
    print("\n验证视图是否创建成功...")
    
    # 构建API请求
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}'
    }
    
    # 尝试从视图中查询数据
    response = requests.get(
        f"{supabase_url}/rest/v1/employee_details_full?limit=1",
        headers=headers
    )
    
    if response.status_code == 200 and response.json():
        print("视图创建成功！")
        print(f"示例数据: {json.dumps(response.json()[0], ensure_ascii=False, indent=2)}")
    else:
        print(f"视图可能未创建成功，无法查询数据。状态码: {response.status_code}")
        print(f"响应内容: {response.text}")
    
except Exception as e:
    print(f'执行过程中出错: {str(e)}') 