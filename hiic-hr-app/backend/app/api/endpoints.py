from fastapi import APIRouter, HTTPException
from app.db.supabase import supabase_client
from datetime import datetime

router = APIRouter()

@router.get("/employees")
async def get_all_employees():
    """获取所有员工数据"""
    try:
        # 使用supabase_client获取所有员工
        employees = supabase_client.get_all_employees()
        if not employees:
            return []
        
        # 格式化员工数据
        formatted_employees = []
        for employee in employees:
            # 确保id是字符串类型
            emp_id = str(employee.get("id", "")) if employee.get("id") is not None else ""
            
            # 获取姓名，确保name和姓名字段都存在
            emp_name = employee.get("name", employee.get("姓名", ""))
            
            # 创建一个新的格式化员工对象，确保字段名称正确
            formatted_emp = {
                "id": emp_id,
                "name": emp_name,
                "姓名": emp_name,
                "性别": employee.get("gender", employee.get("性别", "")),
                "年龄": employee.get("age", employee.get("年龄", 0)),
                "部门": employee.get("department", employee.get("部门", "")),
                "职位": employee.get("position", employee.get("职位", "")),
                "学历": employee.get("education_level", employee.get("学历", "")),
                "毕业院校": employee.get("university", employee.get("毕业院校", "")),
                "专业": employee.get("major", employee.get("专业", "")),
                "入职日期": employee.get("hire_date", employee.get("入职日期", "")),
                "工作年限": employee.get("total_work_years", employee.get("工作年限", 0)),
                "在职年限": employee.get("company_years", employee.get("在职年限", 0))
            }
            formatted_employees.append(formatted_emp)
        
        print(f"成功获取所有员工数据，共{len(formatted_employees)}条记录")
        return formatted_employees
    except Exception as e:
        print(f"获取所有员工数据时出错: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"获取所有员工数据时出错: {str(e)}")

@router.get("/employees/{employee_id}")
async def get_employee(employee_id: int):
    """根据ID获取员工数据"""
    try:
        # 使用get_employee_by_id方法获取员工详情
        employee = supabase_client.get_employee_by_id(str(employee_id))
        if not employee:
            raise HTTPException(status_code=404, detail=f"未找到ID为{employee_id}的员工")
        
        # 确保id是字符串类型
        emp_id = str(employee.get("id", "")) if employee.get("id") is not None else str(employee_id)
        
        # 获取姓名，确保name和姓名字段都存在
        emp_name = employee.get("name", employee.get("姓名", ""))
        
        # 创建一个新的格式化员工对象，确保字段名称正确
        formatted_emp = {
            "id": emp_id,
            "name": emp_name,
            "姓名": emp_name,
            "性别": employee.get("gender", employee.get("性别", "")),
            "年龄": employee.get("age", employee.get("年龄", 0)),
            "部门": employee.get("department", employee.get("部门", "")),
            "职位": employee.get("position", employee.get("职位", "")),
            "学历": employee.get("education_level", employee.get("学历", "")),
            "毕业院校": employee.get("university", employee.get("毕业院校", "")),
            "专业": employee.get("major", employee.get("专业", "")),
            "入职日期": employee.get("hire_date", employee.get("入职日期", "")),
            "工作年限": employee.get("total_work_years", employee.get("工作年限", 0)),
            "在职年限": employee.get("company_years", employee.get("在职年限", 0)),
            "出生日期": employee.get("birth_date", employee.get("出生日期", ""))
        }
        
        # 处理工作变动信息
        if "job_change" in employee and employee["job_change"]:
            formatted_emp["job_change"] = employee["job_change"]
            
            # 添加工作变动描述文本
            job_change_text = []
            for change in employee["job_change"]:
                change_date = change.get("change_date", "")
                change_description = change.get("change_description", "")
                
                if change_date and change_description:
                    job_change_text.append(f"{change_date}: {change_description}")
            
            formatted_emp["工作变动"] = job_change_text
        
        # 处理晋升信息
        if "promotion" in employee and employee["promotion"]:
            formatted_emp["promotion"] = employee["promotion"]
            
            # 添加晋升描述文本
            promotion_text = []
            for promo in employee["promotion"]:
                promo_date = promo.get("promotion_date", "")
                promo_desc = promo.get("promotion_description", "")
                from_pos = promo.get("from_position", "")
                to_pos = promo.get("to_position", "")
                
                if promo_date and promo_desc:
                    promotion_text.append(f"{promo_date}: {promo_desc}")
                elif promo_date and from_pos and to_pos:
                    promotion_text.append(f"{promo_date}: 从 {from_pos} 晋升至 {to_pos}")
            
            formatted_emp["晋升记录"] = promotion_text
        
        # 处理奖项信息
        if "awards" in employee and employee["awards"]:
            formatted_emp["awards"] = employee["awards"]
            
            # 添加奖项描述文本
            awards_text = []
            for award in employee["awards"]:
                award_year = award.get("award_year", "")
                award_name = award.get("award_name", "")
                
                if award_year and award_name:
                    awards_text.append(f"{award_year}年: {award_name}")
            
            formatted_emp["获奖情况"] = awards_text
        
        print(f"成功获取员工ID={employee_id}的详细信息")
        return formatted_emp
    except HTTPException:
        raise
    except Exception as e:
        print(f"获取员工数据时出错: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"获取员工数据时出错: {str(e)}")

@router.get("/birthdays/current-month")
async def get_current_month_birthdays():
    """获取本月生日的员工列表"""
    try:
        # 获取所有员工
        employees = supabase_client.get_all_employees()
        if not employees:
            return []
        
        # 获取当前月份
        current_month = datetime.now().month
        
        # 筛选本月生日的员工
        birthday_employees = []
        for employee in employees:
            birth_date = employee.get("birth_date")
            if birth_date:
                try:
                    # 尝试解析出生日期
                    birth_month = datetime.strptime(birth_date, "%Y-%m-%d").month
                    if birth_month == current_month:
                        # 确保id是字符串类型
                        emp_id = str(employee.get("id", "")) if employee.get("id") is not None else ""
                        
                        # 获取姓名，确保name和姓名字段都存在
                        emp_name = employee.get("name", employee.get("姓名", ""))
                        
                        # 创建一个新的格式化员工对象
                        formatted_emp = {
                            "id": emp_id,
                            "name": emp_name,
                            "姓名": emp_name,
                            "性别": employee.get("gender", employee.get("性别", "")),
                            "年龄": employee.get("age", employee.get("年龄", 0)),
                            "部门": employee.get("department", employee.get("部门", "")),
                            "职位": employee.get("position", employee.get("职位", "")),
                            "出生日期": birth_date,
                            "入职日期": employee.get("hire_date", employee.get("入职日期", ""))
                        }
                        birthday_employees.append(formatted_emp)
                except (ValueError, TypeError):
                    # 如果日期格式不正确，跳过该员工
                    continue
        
        print(f"本月生日员工数量: {len(birthday_employees)}")
        return birthday_employees
    except Exception as e:
        print(f"获取本月生日员工数据时出错: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"获取本月生日员工数据时出错: {str(e)}") 