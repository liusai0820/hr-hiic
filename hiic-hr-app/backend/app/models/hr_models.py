from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import date

class Employee(BaseModel):
    """员工模型"""
    id: int
    # 允许任意额外字段
    class Config:
        extra = "allow"

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

class DepartmentStat(BaseModel):
    """部门统计模型"""
    department: str
    count: int

class GenderStat(BaseModel):
    """性别统计模型"""
    gender: str
    count: int

class EducationStat(BaseModel):
    """学历统计模型"""
    education: str
    count: int

class AgeStats(BaseModel):
    """年龄统计模型"""
    mean: float
    median: float
    min: float
    max: float
    std: float

class StatsResponse(BaseModel):
    """统计响应模型"""
    departments: List[DepartmentStat]
    genders: List[GenderStat]
    educations: List[EducationStat]
    age: AgeStats 