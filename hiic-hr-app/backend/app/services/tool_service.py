import json
import re
from typing import Dict, List, Any, Optional, Union, Callable
import inspect
from app.services.data_analysis_service import hr_data_analysis
from app.db.supabase import supabase_client

class ToolService:
    """工具服务，提供各种HR分析工具"""
    
    def __init__(self):
        """初始化工具服务"""
        # 注册工具
        self.tools = {
            "analyze_department": self.analyze_department,
            "analyze_gender_distribution": self.analyze_gender_distribution,
            "analyze_age_distribution": self.analyze_age_distribution,
            "analyze_salary_distribution": self.analyze_salary_distribution,
            "analyze_education_distribution": self.analyze_education_distribution,
            "analyze_employee_tenure": self.analyze_employee_tenure,
            "find_employee": self.find_employee,
            "compare_departments": self.compare_departments,
            "get_department_manager": self.get_department_manager,
            "get_employee_performance": self.get_employee_performance
        }
        
        # 工具描述
        self.tool_descriptions = [
            {
                "name": "analyze_department",
                "description": "分析指定部门的人员结构和基本信息",
                "parameters": [
                    {
                        "name": "department",
                        "type": "string",
                        "description": "部门名称",
                        "required": True
                    }
                ]
            },
            {
                "name": "analyze_gender_distribution",
                "description": "分析公司或指定部门的性别分布",
                "parameters": [
                    {
                        "name": "department",
                        "type": "string",
                        "description": "部门名称（可选，不提供则分析整个公司）",
                        "required": False
                    }
                ]
            },
            {
                "name": "analyze_age_distribution",
                "description": "分析公司或指定部门的年龄分布",
                "parameters": [
                    {
                        "name": "department",
                        "type": "string",
                        "description": "部门名称（可选，不提供则分析整个公司）",
                        "required": False
                    }
                ]
            },
            {
                "name": "analyze_salary_distribution",
                "description": "分析公司或指定部门的薪资分布",
                "parameters": [
                    {
                        "name": "department",
                        "type": "string",
                        "description": "部门名称（可选，不提供则分析整个公司）",
                        "required": False
                    }
                ]
            },
            {
                "name": "analyze_education_distribution",
                "description": "分析公司或指定部门的学历分布",
                "parameters": [
                    {
                        "name": "department",
                        "type": "string",
                        "description": "部门名称（可选，不提供则分析整个公司）",
                        "required": False
                    }
                ]
            },
            {
                "name": "analyze_employee_tenure",
                "description": "分析员工的工作年限分布",
                "parameters": [
                    {
                        "name": "department",
                        "type": "string",
                        "description": "部门名称（可选，不提供则分析整个公司）",
                        "required": False
                    }
                ]
            },
            {
                "name": "find_employee",
                "description": "查找特定员工的信息",
                "parameters": [
                    {
                        "name": "name",
                        "type": "string",
                        "description": "员工姓名",
                        "required": True
                    }
                ]
            },
            {
                "name": "compare_departments",
                "description": "比较两个部门的各项指标",
                "parameters": [
                    {
                        "name": "department1",
                        "type": "string",
                        "description": "第一个部门名称",
                        "required": True
                    },
                    {
                        "name": "department2",
                        "type": "string",
                        "description": "第二个部门名称",
                        "required": True
                    }
                ]
            },
            {
                "name": "get_department_manager",
                "description": "获取部门经理信息",
                "parameters": [
                    {
                        "name": "department",
                        "type": "string",
                        "description": "部门名称",
                        "required": True
                    }
                ]
            },
            {
                "name": "get_employee_performance",
                "description": "获取员工绩效信息",
                "parameters": [
                    {
                        "name": "name",
                        "type": "string",
                        "description": "员工姓名",
                        "required": True
                    }
                ]
            }
        ]
    
    def get_tool_descriptions(self) -> List[Dict[str, Any]]:
        """获取所有工具的描述"""
        return self.tool_descriptions
    
    def execute_tool_calls(self, tool_calls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """执行工具调用"""
        results = []
        
        for call in tool_calls:
            tool_name = call.get("name", "")
            arguments = call.get("arguments", {})
            
            # 检查工具是否存在
            if tool_name not in self.tools:
                results.append({
                    "status": "error",
                    "error": f"未知工具: {tool_name}",
                    "result": None
                })
                continue
            
            try:
                # 执行工具
                tool_func = self.tools[tool_name]
                result = tool_func(**arguments)
                
                results.append({
                    "status": "success",
                    "result": result
                })
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                print(f"工具服务：执行工具 {tool_name} 失败 - {str(e)}")
                print(f"错误详情: {error_trace}")
                
                results.append({
                    "status": "error",
                    "error": str(e),
                    "result": None
                })
        
        return results
    
    # 以下是各种工具实现
    
    def analyze_department(self, department: str) -> Dict[str, Any]:
        """分析指定部门的人员结构和基本信息"""
        try:
            # 获取部门基本信息
            dept_info = supabase_client.get_department_info(department)
            
            # 获取部门员工信息
            employees = supabase_client.get_department_employees(department)
            
            # 计算性别分布
            gender_counts = {"男": 0, "女": 0}
            for emp in employees:
                gender = emp.get("gender", "未知")
                if gender in gender_counts:
                    gender_counts[gender] += 1
            
            # 计算年龄分布
            ages = [emp.get("age", 0) for emp in employees if emp.get("age", 0) > 0]
            age_stats = {
                "min": min(ages) if ages else 0,
                "max": max(ages) if ages else 0,
                "mean": sum(ages) / len(ages) if ages else 0
            }
            
            # 计算职位分布
            position_counts = {}
            for emp in employees:
                position = emp.get("position", "未知")
                position_counts[position] = position_counts.get(position, 0) + 1
            
            # 计算学历分布
            education_counts = {}
            for emp in employees:
                education = emp.get("education", "未知")
                education_counts[education] = education_counts.get(education, 0) + 1
            
            return {
                "department_info": dept_info,
                "employee_count": len(employees),
                "gender_distribution": gender_counts,
                "age_stats": age_stats,
                "position_distribution": position_counts,
                "education_distribution": education_counts
            }
        except Exception as e:
            print(f"分析部门失败: {str(e)}")
            return {"error": f"分析部门失败: {str(e)}"}
    
    def analyze_gender_distribution(self, department: Optional[str] = None) -> Dict[str, Any]:
        """分析公司或指定部门的性别分布"""
        try:
            if department:
                # 获取部门员工信息
                employees = supabase_client.get_department_employees(department)
            else:
                # 获取所有员工信息
                employees = supabase_client.get_all_employees()
            
            # 计算性别分布
            gender_counts = {"男": 0, "女": 0}
            for emp in employees:
                gender = emp.get("gender", "未知")
                if gender in gender_counts:
                    gender_counts[gender] += 1
            
            # 计算性别比例
            total = sum(gender_counts.values())
            gender_ratio = {
                gender: count / total if total > 0 else 0
                for gender, count in gender_counts.items()
            }
            
            return {
                "scope": department if department else "全公司",
                "total_employees": total,
                "gender_counts": gender_counts,
                "gender_ratio": gender_ratio
            }
        except Exception as e:
            print(f"分析性别分布失败: {str(e)}")
            return {"error": f"分析性别分布失败: {str(e)}"}
    
    def analyze_age_distribution(self, department: Optional[str] = None) -> Dict[str, Any]:
        """分析公司或指定部门的年龄分布"""
        try:
            if department:
                # 获取部门员工信息
                employees = supabase_client.get_department_employees(department)
            else:
                # 获取所有员工信息
                employees = supabase_client.get_all_employees()
            
            # 提取年龄
            ages = [emp.get("age", 0) for emp in employees if emp.get("age", 0) > 0]
            
            if not ages:
                return {
                    "scope": department if department else "全公司",
                    "error": "没有有效的年龄数据"
                }
            
            # 计算年龄统计
            age_stats = {
                "min": min(ages),
                "max": max(ages),
                "mean": sum(ages) / len(ages),
                "median": sorted(ages)[len(ages) // 2]
            }
            
            # 计算年龄段分布
            age_ranges = {
                "20岁以下": 0,
                "20-29岁": 0,
                "30-39岁": 0,
                "40-49岁": 0,
                "50岁及以上": 0
            }
            
            for age in ages:
                if age < 20:
                    age_ranges["20岁以下"] += 1
                elif age < 30:
                    age_ranges["20-29岁"] += 1
                elif age < 40:
                    age_ranges["30-39岁"] += 1
                elif age < 50:
                    age_ranges["40-49岁"] += 1
                else:
                    age_ranges["50岁及以上"] += 1
            
            return {
                "scope": department if department else "全公司",
                "total_employees": len(employees),
                "valid_age_count": len(ages),
                "age_stats": age_stats,
                "age_ranges": age_ranges
            }
        except Exception as e:
            print(f"分析年龄分布失败: {str(e)}")
            return {"error": f"分析年龄分布失败: {str(e)}"}
    
    def analyze_salary_distribution(self, department: Optional[str] = None) -> Dict[str, Any]:
        """分析公司或指定部门的薪资分布"""
        try:
            if department:
                # 获取部门员工信息
                employees = supabase_client.get_department_employees(department)
            else:
                # 获取所有员工信息
                employees = supabase_client.get_all_employees()
            
            # 提取薪资
            salaries = [emp.get("salary", 0) for emp in employees if emp.get("salary", 0) > 0]
            
            if not salaries:
                return {
                    "scope": department if department else "全公司",
                    "error": "没有有效的薪资数据"
                }
            
            # 计算薪资统计
            salary_stats = {
                "min": min(salaries),
                "max": max(salaries),
                "mean": sum(salaries) / len(salaries),
                "median": sorted(salaries)[len(salaries) // 2]
            }
            
            # 计算薪资段分布
            salary_ranges = {
                "5000以下": 0,
                "5000-10000": 0,
                "10000-15000": 0,
                "15000-20000": 0,
                "20000以上": 0
            }
            
            for salary in salaries:
                if salary < 5000:
                    salary_ranges["5000以下"] += 1
                elif salary < 10000:
                    salary_ranges["5000-10000"] += 1
                elif salary < 15000:
                    salary_ranges["10000-15000"] += 1
                elif salary < 20000:
                    salary_ranges["15000-20000"] += 1
                else:
                    salary_ranges["20000以上"] += 1
            
            return {
                "scope": department if department else "全公司",
                "total_employees": len(employees),
                "valid_salary_count": len(salaries),
                "salary_stats": salary_stats,
                "salary_ranges": salary_ranges
            }
        except Exception as e:
            print(f"分析薪资分布失败: {str(e)}")
            return {"error": f"分析薪资分布失败: {str(e)}"}
    
    def analyze_education_distribution(self, department: Optional[str] = None) -> Dict[str, Any]:
        """分析公司或指定部门的学历分布"""
        try:
            if department:
                # 获取部门员工信息
                employees = supabase_client.get_department_employees(department)
            else:
                # 获取所有员工信息
                employees = supabase_client.get_all_employees()
            
            # 计算学历分布
            education_counts = {}
            for emp in employees:
                education = emp.get("education", "未知")
                education_counts[education] = education_counts.get(education, 0) + 1
            
            # 计算学历比例
            total = len(employees)
            education_ratio = {
                edu: count / total if total > 0 else 0
                for edu, count in education_counts.items()
            }
            
            return {
                "scope": department if department else "全公司",
                "total_employees": total,
                "education_counts": education_counts,
                "education_ratio": education_ratio
            }
        except Exception as e:
            print(f"分析学历分布失败: {str(e)}")
            return {"error": f"分析学历分布失败: {str(e)}"}
    
    def analyze_employee_tenure(self, department: Optional[str] = None) -> Dict[str, Any]:
        """分析员工的工作年限分布"""
        try:
            if department:
                # 获取部门员工信息
                employees = supabase_client.get_department_employees(department)
            else:
                # 获取所有员工信息
                employees = supabase_client.get_all_employees()
            
            # 计算工作年限
            from datetime import datetime
            current_year = datetime.now().year
            
            tenures = []
            for emp in employees:
                hire_date = emp.get("hire_date")
                if hire_date:
                    try:
                        hire_year = datetime.strptime(hire_date, "%Y-%m-%d").year
                        tenure = current_year - hire_year
                        tenures.append(tenure)
                    except:
                        pass
            
            if not tenures:
                return {
                    "scope": department if department else "全公司",
                    "error": "没有有效的入职日期数据"
                }
            
            # 计算工作年限统计
            tenure_stats = {
                "min": min(tenures),
                "max": max(tenures),
                "mean": sum(tenures) / len(tenures),
                "median": sorted(tenures)[len(tenures) // 2]
            }
            
            # 计算工作年限分布
            tenure_ranges = {
                "1年以下": 0,
                "1-3年": 0,
                "3-5年": 0,
                "5-10年": 0,
                "10年以上": 0
            }
            
            for tenure in tenures:
                if tenure < 1:
                    tenure_ranges["1年以下"] += 1
                elif tenure < 3:
                    tenure_ranges["1-3年"] += 1
                elif tenure < 5:
                    tenure_ranges["3-5年"] += 1
                elif tenure < 10:
                    tenure_ranges["5-10年"] += 1
                else:
                    tenure_ranges["10年以上"] += 1
            
            return {
                "scope": department if department else "全公司",
                "total_employees": len(employees),
                "valid_tenure_count": len(tenures),
                "tenure_stats": tenure_stats,
                "tenure_ranges": tenure_ranges
            }
        except Exception as e:
            print(f"分析工作年限失败: {str(e)}")
            return {"error": f"分析工作年限失败: {str(e)}"}
    
    def find_employee(self, name: str) -> Dict[str, Any]:
        """查找特定员工的信息"""
        try:
            # 查找员工
            employee = supabase_client.find_employee_by_name(name)
            
            if not employee:
                return {"error": f"未找到员工: {name}"}
            
            # 获取部门信息
            department = None
            if employee.get("department_id"):
                department = supabase_client.get_department_by_id(employee["department_id"])
            
            # 获取绩效信息
            performance = supabase_client.get_employee_performance(employee["id"])
            
            # 获取考勤信息
            attendance = supabase_client.get_employee_attendance(employee["id"])
            
            return {
                "employee": employee,
                "department": department,
                "performance": performance,
                "attendance": attendance
            }
        except Exception as e:
            print(f"查找员工失败: {str(e)}")
            return {"error": f"查找员工失败: {str(e)}"}
    
    def compare_departments(self, department1: str, department2: str) -> Dict[str, Any]:
        """比较两个部门的各项指标"""
        try:
            # 获取两个部门的分析结果
            dept1_analysis = self.analyze_department(department1)
            dept2_analysis = self.analyze_department(department2)
            
            # 比较员工数量
            employee_count_comparison = {
                department1: dept1_analysis.get("employee_count", 0),
                department2: dept2_analysis.get("employee_count", 0)
            }
            
            # 比较性别分布
            gender_comparison = {
                department1: dept1_analysis.get("gender_distribution", {}),
                department2: dept2_analysis.get("gender_distribution", {})
            }
            
            # 比较年龄统计
            age_comparison = {
                department1: dept1_analysis.get("age_stats", {}),
                department2: dept2_analysis.get("age_stats", {})
            }
            
            # 比较职位分布
            position_comparison = {
                department1: dept1_analysis.get("position_distribution", {}),
                department2: dept2_analysis.get("position_distribution", {})
            }
            
            # 比较学历分布
            education_comparison = {
                department1: dept1_analysis.get("education_distribution", {}),
                department2: dept2_analysis.get("education_distribution", {})
            }
            
            return {
                "departments": [department1, department2],
                "employee_count_comparison": employee_count_comparison,
                "gender_comparison": gender_comparison,
                "age_comparison": age_comparison,
                "position_comparison": position_comparison,
                "education_comparison": education_comparison
            }
        except Exception as e:
            print(f"比较部门失败: {str(e)}")
            return {"error": f"比较部门失败: {str(e)}"}
    
    def get_department_manager(self, department: str) -> Dict[str, Any]:
        """获取部门经理信息"""
        try:
            # 获取部门信息
            dept_info = supabase_client.get_department_info(department)
            
            if not dept_info:
                return {"error": f"未找到部门: {department}"}
            
            # 获取经理信息
            manager = None
            if dept_info.get("manager_id"):
                manager = supabase_client.get_employee_by_id(dept_info["manager_id"])
            
            if not manager:
                return {
                    "department": dept_info,
                    "error": "该部门暂无经理"
                }
            
            return {
                "department": dept_info,
                "manager": manager
            }
        except Exception as e:
            print(f"获取部门经理失败: {str(e)}")
            return {"error": f"获取部门经理失败: {str(e)}"}
    
    def get_employee_performance(self, name: str) -> Dict[str, Any]:
        """获取员工绩效信息"""
        try:
            # 查找员工
            employee = supabase_client.find_employee_by_name(name)
            
            if not employee:
                return {"error": f"未找到员工: {name}"}
            
            # 获取绩效信息
            performance = supabase_client.get_employee_performance(employee["id"])
            
            if not performance:
                return {
                    "employee": employee,
                    "error": "该员工暂无绩效记录"
                }
            
            # 计算平均绩效
            scores = [p.get("score", 0) for p in performance if p.get("score", 0) > 0]
            avg_score = sum(scores) / len(scores) if scores else 0
            
            return {
                "employee": employee,
                "performance_records": performance,
                "record_count": len(performance),
                "average_score": avg_score
            }
        except Exception as e:
            print(f"获取员工绩效失败: {str(e)}")
            return {"error": f"获取员工绩效失败: {str(e)}"}

# 创建全局工具服务实例
tool_service = ToolService() 