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
    """获取Supabase中的表结构"""
    print(f"Supabase URL: {SUPABASE_URL[:20]}...")
    print(f"Supabase Key: {SUPABASE_KEY[:10]}...")
    
    try:
        # 初始化Supabase客户端
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase客户端初始化成功")
        
        # 获取所有表
        print("\n尝试获取所有表...")
        try:
            # 方法1：使用SQL查询获取表列表
            query = """
            SELECT table_name, table_schema
            FROM information_schema.tables
            WHERE table_schema = 'public'
            """
            
            # 尝试直接执行SQL查询
            try:
                response = client.rpc('execute_sql', {'query': query}).execute()
                if hasattr(response, 'data') and response.data:
                    print("\n使用RPC方法获取的表:")
                    for table in response.data:
                        print(f"- {table.get('table_name')}")
            except Exception as e:
                print(f"使用RPC方法获取表失败: {str(e)}")
            
            # 方法2：直接获取所有表
            print("\n尝试直接获取所有表...")
            tables = []
            
            # 尝试列出所有表
            try:
                # 这个方法可能不适用于所有Supabase实例
                response = client.table('').select('*').limit(1).execute()
                print("可以访问的表:")
                print(response)
            except Exception as e:
                print(f"直接获取表失败: {str(e)}")
            
            # 方法3：尝试获取特定表的结构
            print("\n尝试获取特定表的结构...")
            potential_tables = ['employees', 'departments', 'hr_data', 'users', 'profiles']
            
            for table in potential_tables:
                try:
                    print(f"\n尝试获取表 '{table}' 的数据...")
                    response = client.table(table).select('*').limit(1).execute()
                    if hasattr(response, 'data'):
                        print(f"表 '{table}' 存在，获取到 {len(response.data)} 条记录")
                        if response.data:
                            print(f"表 '{table}' 的列:")
                            for key in response.data[0].keys():
                                print(f"  - {key}")
                    else:
                        print(f"表 '{table}' 可能不存在或无法访问")
                except Exception as e:
                    print(f"获取表 '{table}' 失败: {str(e)}")
        
        except Exception as e:
            print(f"获取表列表失败: {str(e)}")
    
    except Exception as e:
        print(f"Supabase客户端初始化失败: {str(e)}")

if __name__ == "__main__":
    main() 