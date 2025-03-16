from fastapi import APIRouter, HTTPException, Depends, Body
from app.models.hr_models import ChatRequest, ChatResponse, Employee, StatsResponse
from app.services.chat_service import hr_chat_service
from app.services.enhanced_chat_service import enhanced_hr_chat_service
from app.services.visualization_service import visualization_service
from app.db.supabase import supabase_client
from typing import List, Dict, Any
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# 用户管理相关模型
class UserApprovalRequest(BaseModel):
    user_id: str
    approved: bool

class UserResponse(BaseModel):
    id: str
    email: str
    approved: bool
    role: str
    created_at: str

@router.get("/", response_model=Dict[str, str])
async def root():
    """根路径，返回API信息"""
    return {"message": "欢迎使用HIIC HR AI应用API"}

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """聊天API，处理用户问题并返回AI回复"""
    try:
        print(f"收到聊天请求: {request.messages[-1].content if request.messages else '空消息'}")
        response = await hr_chat_service.get_response(request.messages)
        print(f"返回聊天响应: {response[:100]}...")
        return ChatResponse(response=response)
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"处理聊天请求时出错: {str(e)}")
        print(f"错误详情: {error_trace}")
        raise HTTPException(status_code=500, detail=f"处理聊天请求时出错: {str(e)}")

@router.post("/enhanced-chat", response_model=ChatResponse)
async def enhanced_chat(request: ChatRequest):
    """增强版聊天API，支持工具调用和复杂推理"""
    try:
        print(f"收到增强版聊天请求: {request.messages[-1].content if request.messages else '空消息'}")
        response = await enhanced_hr_chat_service.get_response(request.messages)
        print(f"返回增强版聊天响应: {response[:100]}...")
        return ChatResponse(response=response)
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"处理增强版聊天请求时出错: {str(e)}")
        print(f"错误详情: {error_trace}")
        raise HTTPException(status_code=500, detail=f"处理增强版聊天请求时出错: {str(e)}")

@router.get("/employees", response_model=List[Employee])
async def get_employees():
    """获取所有员工数据"""
    try:
        employees = supabase_client.get_all_employees()
        
        # 转换数据格式，确保前端可以正确显示
        formatted_employees = []
        for emp in employees:
            formatted_emp = {
                "id": emp.get("id"),
                "姓名": emp.get("name"),
                "性别": emp.get("gender"),
                "年龄": emp.get("age"),
                "部门": emp.get("department"),
                "职位": emp.get("position"),
                "学历": emp.get("education"),
                "毕业院校": emp.get("university"),
                "专业": emp.get("major"),
                "入职日期": emp.get("hire_date"),
                "工作年限": emp.get("total_work_years"),
                "在职年限": emp.get("company_years")
            }
            formatted_employees.append(formatted_emp)
            
        return formatted_employees
    except Exception as e:
        print(f"获取员工数据时出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取员工数据时出错: {str(e)}")

@router.get("/employees/{employee_id}", response_model=Employee)
async def get_employee(employee_id: int):
    """根据ID获取员工数据"""
    try:
        employee = supabase_client.get_employee_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail=f"未找到ID为{employee_id}的员工")
            
        # 转换数据格式，确保前端可以正确显示
        formatted_emp = {
            "id": employee.get("id"),
            "姓名": employee.get("name"),
            "性别": employee.get("gender"),
            "年龄": employee.get("age"),
            "部门": employee.get("department"),
            "职位": employee.get("position"),
            "学历": employee.get("education"),
            "毕业院校": employee.get("university"),
            "专业": employee.get("major"),
            "入职日期": employee.get("hire_date"),
            "工作年限": employee.get("total_work_years"),
            "在职年限": employee.get("company_years"),
            "出生日期": employee.get("birth_date")
        }
        
        # 处理特殊字段
        if "job_change" in employee and isinstance(employee["job_change"], list):
            formatted_emp["工作变动"] = ", ".join([str(item) for item in employee["job_change"] if item])
            
        if "promotion" in employee and isinstance(employee["promotion"], list):
            formatted_emp["晋升记录"] = ", ".join([str(item) for item in employee["promotion"] if item])
            
        if "awards" in employee and isinstance(employee["awards"], list):
            formatted_emp["获奖情况"] = ", ".join([str(item) for item in employee["awards"] if item])
            
        return formatted_emp
    except HTTPException:
        raise
    except Exception as e:
        print(f"获取员工数据时出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取员工数据时出错: {str(e)}")

@router.get("/departments/{department}/employees", response_model=List[Employee])
async def get_employees_by_department(department: str):
    """根据部门获取员工数据"""
    try:
        employees = supabase_client.get_employees_by_department(department)
        return employees
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取部门员工数据时出错: {str(e)}")

@router.get("/stats", response_model=Dict[str, Any])
async def get_stats():
    """获取统计数据"""
    try:
        # 获取各种统计数据
        dept_stats = supabase_client.get_department_stats()
        gender_stats = supabase_client.get_gender_stats()
        age_stats = supabase_client.get_age_stats()
        education_stats = supabase_client.get_education_stats()
        
        # 转换为前端需要的格式
        return {
            "departments": [{"department": dept, "count": count} for dept, count in dept_stats.items()],
            "genders": [{"gender": gender, "count": count} for gender, count in gender_stats.items()],
            "age": age_stats,
            "educations": [{"education": edu, "count": count} for edu, count in education_stats.items()]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计数据时出错: {str(e)}")

# 用户管理相关API
@router.get("/users", response_model=List[UserResponse])
async def get_all_users():
    """获取所有用户列表"""
    try:
        # 使用管理员API获取用户列表
        response = supabase_client.get_all_users()
        
        # 格式化用户数据，确保datetime被转换为字符串
        users = []
        for user in response:
            users.append({
                'id': user.id,
                'email': user.email,
                'approved': user.user_metadata.get('approved', False) if user.user_metadata else False,
                'role': user.user_metadata.get('role', 'user') if user.user_metadata else 'user',
                'created_at': user.created_at.isoformat() if hasattr(user, 'created_at') else None
            })
        
        return users
    except Exception as e:
        print(f"获取用户列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取用户列表失败: {str(e)}")

@router.get("/users/pending", response_model=List[UserResponse])
async def get_pending_users():
    """获取待审批用户列表"""
    try:
        users = supabase_client.get_pending_users()
        
        # 格式化用户数据，确保datetime被转换为字符串
        formatted_users = []
        for user in users:
            formatted_users.append({
                'id': user.get('id'),
                'email': user.get('email'),
                'approved': False,
                'role': user.get('role', 'user'),
                'created_at': user.get('created_at')
            })
        
        return formatted_users
    except Exception as e:
        print(f"获取待审批用户列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取待审批用户列表失败: {str(e)}")

@router.post("/users/{user_id}/approve", response_model=Dict[str, bool])
async def approve_user(user_id: str, request: UserApprovalRequest):
    """审批用户"""
    try:
        result = supabase_client.update_user_approval(user_id, request.approved)
        return {"success": result}
    except Exception as e:
        print(f"审批用户失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"审批用户失败: {str(e)}") 