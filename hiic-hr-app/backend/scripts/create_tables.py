"""
创建并填充Supabase数据库表的脚本
"""
import os
import sys
import json
from dotenv import load_dotenv
from supabase import create_client

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# 加载环境变量
load_dotenv()

# 获取配置
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("错误: 缺少Supabase配置")
    sys.exit(1)

# 连接到Supabase
print(f"正在连接到Supabase: {SUPABASE_URL[:30]}...")
client = create_client(SUPABASE_URL, SUPABASE_KEY)
print("Supabase连接成功")

# 加载示例数据
sample_data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'app', 'db', 'sample_data'))

def load_sample_data(filename):
    """加载示例数据文件"""
    file_path = os.path.join(sample_data_dir, filename)
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"无法加载示例数据 {filename}: {str(e)}")
        return []

# 导入数据到表中
def import_data_to_table(table_name, data_file):
    """导入数据到表中"""
    try:
        # 尝试清空表
        try:
            print(f"尝试清空{table_name}表...")
            client.table(table_name).delete().execute()
            print(f"已清空{table_name}表")
        except Exception as e:
            print(f"清空{table_name}表失败，可能表不存在或其他错误: {str(e)}")
            print(f"将直接尝试导入数据...")
        
        # 加载示例数据
        data = load_sample_data(data_file)
        if not data:
            print(f"没有{table_name}数据可导入")
            return False
        
        # 插入数据
        print(f"正在导入 {len(data)} 条{table_name}数据...")
        result = client.table(table_name).insert(data).execute()
        print(f"导入完成，影响 {len(result.data)} 条记录")
        return True
        
    except Exception as e:
        print(f"导入{table_name}数据失败: {str(e)}")
        return False

if __name__ == "__main__":
    print("开始导入数据...")
    
    # 定义表和对应的数据文件
    tables = {
        'employees': 'employees.json',
        'departments': 'departments.json',
        'attendance': 'attendance.json',
        'performance': 'performance.json',
        'training': 'training.json'
    }
    
    success_count = 0
    for table_name, data_file in tables.items():
        if import_data_to_table(table_name, data_file):
            success_count += 1
    
    print(f"数据导入完成，成功导入 {success_count}/{len(tables)} 个表") 