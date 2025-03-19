# 员工详情视图集成方案

## 数据库表结构

通过直接查询数据库，我们获取了以下表的字段信息：

### employees表
- id
- name
- gender
- birth_date
- age
- ethnicity
- department
- position
- sequence
- section
- team
- is_business_dept
- created_at

### education表
- employee_id
- university
- major
- major_category
- education_level
- degree
- is_qs100
- is_qs50
- is_985
- is_211
- is_c9

### work_experience表
- employee_id
- first_work_date
- first_work_month
- hire_date
- company_years
- total_work_years
- current_work_years
- current_company_years
- recruitment_type

### job_changes表
- id
- employee_id
- change_date
- change_description

### promotions表
- id
- employee_id
- promotion_date
- promotion_description
- from_position
- to_position

### awards表
- id
- employee_id
- award_year
- award_name

### departments表
- id
- name
- normalized_name

## 解决方案

我们创建了一个名为`employee_details_full`的视图，该视图整合了员工的基本信息、教育背景、工作经验、工作变动、晋升和奖项信息。视图使用PostgreSQL的JSON聚合功能，将一对多关系的数据（如工作变动、晋升和奖项）聚合为JSON数组，从而在一次查询中获取所有相关信息。

### 视图创建SQL

```sql
-- 创建employee_details_full视图
-- 该视图整合了员工的基本信息、教育背景、工作经验、工作变动、晋升和奖项信息

CREATE OR REPLACE VIEW employee_details_full AS
SELECT 
    e.id,
    e.name,
    e.gender,
    e.birth_date,
    e.age,
    e.ethnicity,
    e.department,
    e.position,
    e.sequence,
    e.section,
    e.team,
    e.is_business_dept,
    e.created_at,
    
    -- 教育信息
    ed.university,
    ed.major,
    ed.major_category,
    ed.education_level,
    ed.degree,
    ed.is_qs100,
    ed.is_qs50,
    ed.is_985,
    ed.is_211,
    ed.is_c9,
    
    -- 工作经验
    we.first_work_date,
    we.first_work_month,
    we.hire_date,
    we.company_years,
    we.total_work_years,
    we.current_work_years,
    we.current_company_years,
    we.recruitment_type,
    
    -- 部门信息
    d.normalized_name AS department_normalized,
    
    -- 工作变动信息（JSON数组）
    COALESCE(
        (
            SELECT json_agg(
                json_build_object(
                    'id', jc.id,
                    'employee_id', jc.employee_id,
                    'change_date', jc.change_date,
                    'change_description', jc.change_description
                )
            )
            FROM job_changes jc
            WHERE jc.employee_id = e.id
        ),
        '[]'::json
    ) AS job_changes,
    
    -- 晋升信息（JSON数组）
    COALESCE(
        (
            SELECT json_agg(
                json_build_object(
                    'id', p.id,
                    'employee_id', p.employee_id,
                    'promotion_date', p.promotion_date,
                    'promotion_description', p.promotion_description,
                    'from_position', p.from_position,
                    'to_position', p.to_position
                )
            )
            FROM promotions p
            WHERE p.employee_id = e.id
        ),
        '[]'::json
    ) AS promotions,
    
    -- 奖项信息（JSON数组）
    COALESCE(
        (
            SELECT json_agg(
                json_build_object(
                    'id', a.id,
                    'employee_id', a.employee_id,
                    'award_year', a.award_year,
                    'award_name', a.award_name
                )
            )
            FROM awards a
            WHERE a.employee_id = e.id
        ),
        '[]'::json
    ) AS awards
    
FROM 
    employees e
LEFT JOIN 
    education ed ON e.id = ed.employee_id
LEFT JOIN 
    work_experience we ON e.id = we.employee_id
LEFT JOIN 
    departments d ON e.department = d.name;

-- 为视图添加注释
COMMENT ON VIEW employee_details_full IS '员工完整信息视图，整合了员工的基本信息、教育背景、工作经验、工作变动、晋升和奖项信息';
```

### 使用方法

1. 登录Supabase管理控制台: https://app.supabase.io
2. 选择您的项目
3. 点击左侧菜单中的'SQL编辑器'
4. 创建一个新的查询
5. 复制上述SQL脚本并粘贴到查询编辑器中
6. 点击'运行'按钮执行SQL脚本

### 在应用中使用

在`endpoints.py`文件中，`get_employee`函数已经被修改为使用`get_employee_details_full_by_id`方法获取员工详情：

```python
@router.get("/employees/{employee_id}", response_model=Employee)
async def get_employee(employee_id: int):
    """根据ID获取员工数据"""
    try:
        # 使用视图获取员工完整详情
        employee = supabase_client.get_employee_details_full_by_id(str(employee_id))
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
            "学历": employee.get("education_level"),
            "毕业院校": employee.get("university"),
            "专业": employee.get("major"),
            "入职日期": employee.get("hire_date"),
            "工作年限": employee.get("total_work_years"),
            "在职年限": employee.get("company_years"),
            "出生日期": employee.get("birth_date")
        }
        
        # 处理工作变动信息
        if "job_changes" in employee and isinstance(employee["job_changes"], list):
            # 将工作变动信息转换为前端可用的格式
            job_changes = []
            for change in employee["job_changes"]:
                # 提取关键信息
                change_date = change.get("change_date")
                change_description = change.get("change_description")
                
                # 构建描述性文本
                description = f"{change_date}: {change_description}"
                
                job_changes.append(description)
            
            formatted_emp["工作变动"] = job_changes
        
        # 处理晋升记录
        if "promotions" in employee and isinstance(employee["promotions"], list):
            # 将晋升记录转换为前端可用的格式
            promotions = []
            for promotion in employee["promotions"]:
                # 提取关键信息
                promotion_date = promotion.get("promotion_date")
                promotion_description = promotion.get("promotion_description")
                from_position = promotion.get("from_position")
                to_position = promotion.get("to_position")
                
                # 构建描述性文本
                description = f"{promotion_date}: 从{from_position}晋升至{to_position}"
                if promotion_description:
                    description += f"，{promotion_description}"
                
                promotions.append(description)
            
            formatted_emp["晋升记录"] = promotions
        
        # 处理获奖情况
        if "awards" in employee and isinstance(employee["awards"], list):
            # 将获奖情况转换为前端可用的格式
            awards = []
            for award in employee["awards"]:
                # 提取关键信息
                award_year = award.get("award_year")
                award_name = award.get("award_name")
                
                # 构建描述性文本
                award_text = f"{award_year}年: 获得{award_name}"
                
                awards.append(award_text)
            
            formatted_emp["获奖情况"] = awards
            
        return formatted_emp
    except HTTPException:
        raise
    except Exception as e:
        print(f"获取员工数据时出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取员工数据时出错: {str(e)}")
```

## 优势

1. **数据整合**：将分散在多个表中的员工信息整合到一个视图中，简化了数据获取过程。
2. **性能优化**：通过一次查询获取所有相关信息，减少了多次查询的开销。
3. **JSON聚合**：使用PostgreSQL的JSON聚合功能，将一对多关系的数据（如工作变动、晋升和奖项）聚合为JSON数组，方便前端处理。
4. **维护性**：视图的使用使得数据结构变更时只需修改视图定义，而不需要修改应用代码。
5. **可读性**：视图提供了一个清晰的数据结构，使得开发人员更容易理解数据之间的关系。

## 注意事项

1. 确保Supabase数据库中存在所有相关表和字段。
2. 视图创建后，需要在应用代码中使用`get_employee_details_full_by_id`方法获取员工详情。
3. 如果表结构发生变化，需要更新视图定义。 