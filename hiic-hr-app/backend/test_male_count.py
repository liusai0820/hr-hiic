from app.db.supabase import supabase_client
import json

def test_male_count_by_department():
    """测试按部门统计男性员工数量"""
    print("测试按部门统计男性员工数量...")
    
    # 构造SQL查询
    sql_query = """
    SELECT d.name AS department_name, COUNT(e.id) AS male_count
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    WHERE e.gender = '男'
    GROUP BY d.name
    ORDER BY male_count DESC
    """
    
    # 执行SQL查询
    try:
        result = supabase_client.execute_sql(sql_query)
        print(f"查询结果: {json.dumps(result, ensure_ascii=False, indent=2)}")
        
        if result and isinstance(result, list) and len(result) > 0:
            if 'error' in result[0]:
                print(f"查询失败: {result[0].get('error')}")
                print(f"错误消息: {result[0].get('message')}")
            else:
                print("查询成功!")
                print(f"男性员工最多的部门是: {result[0].get('department')}，共有{result[0].get('male_count')}人")
        else:
            print("查询结果为空")
    except Exception as e:
        print(f"执行查询时出错: {str(e)}")

if __name__ == "__main__":
    test_male_count_by_department() 