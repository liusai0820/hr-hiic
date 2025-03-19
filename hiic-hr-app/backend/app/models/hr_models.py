from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import date, datetime

class ChatMessage(BaseModel):
    """聊天消息模型"""
    role: str
    content: str

class ChatRequest(BaseModel):
    """聊天请求模型"""
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    """聊天响应模型"""
    response: str

class Employee(BaseModel):
    """员工模型"""
    id: str
    name: str
    姓名: str
    性别: Optional[str] = None
    年龄: Optional[int] = None
    部门: Optional[str] = None
    职位: Optional[str] = None
    学历: Optional[str] = None
    毕业院校: Optional[str] = None
    专业: Optional[str] = None
    入职日期: Optional[str] = None
    工作年限: Optional[str] = None
    在职年限: Optional[str] = None
    出生日期: Optional[str] = None
    salary: Optional[float] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class Department(BaseModel):
    """部门模型"""
    id: str
    name: str
    manager_id: Optional[str] = None
    description: Optional[str] = None

class Performance(BaseModel):
    """绩效模型"""
    id: str
    employee_id: str
    year: int
    quarter: int
    score: float
    comments: Optional[str] = None

class Attendance(BaseModel):
    """考勤模型"""
    id: str
    employee_id: str
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    status: Optional[str] = None

class Training(BaseModel):
    """培训模型"""
    id: str
    employee_id: str
    course_name: str
    start_date: str
    end_date: str
    status: str
    score: Optional[float] = None

class StatsResponse(BaseModel):
    """统计响应模型"""
    departments: List[Dict[str, Any]]
    genders: List[Dict[str, Any]]
    age: Dict[str, Any]
    educations: List[Dict[str, Any]] 