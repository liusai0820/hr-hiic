from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from app.services.visualization_service import visualization_service

router = APIRouter(prefix="/api/visualizations", tags=["visualizations"])

@router.get("/")
async def get_all_visualizations():
    """获取所有可视化数据"""
    return visualization_service.get_all_visualizations()

@router.get("/employees/{visualization_type}")
async def get_visualization_employees(
    visualization_type: str, 
    category: str = Query(..., description="分类名称，如年龄段、部门名称等")
):
    """获取特定可视化分类下的员工列表"""
    try:
        print(f"收到获取员工列表请求: 类型={visualization_type}, 分类={category}")
        employees = visualization_service.get_employees_by_category(visualization_type, category)
        print(f"找到{len(employees)}名员工")
        return {
            "visualization_type": visualization_type,
            "category": category,
            "total": len(employees),
            "employees": employees
        }
    except ValueError as e:
        print(f"获取员工列表参数错误: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"获取员工列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取员工列表失败: {str(e)}")

@router.get("/{visualization_type}")
async def get_visualization(visualization_type: str):
    """获取特定类型的可视化数据"""
    try:
        visualizations = visualization_service.get_all_visualizations()
        if visualization_type not in visualizations:
            print(f"可视化类型不存在: {visualization_type}")
            raise HTTPException(status_code=404, detail=f"可视化类型 '{visualization_type}' 不存在")
        return visualizations[visualization_type]
    except HTTPException:
        raise
    except Exception as e:
        print(f"获取可视化数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取可视化数据失败: {str(e)}") 