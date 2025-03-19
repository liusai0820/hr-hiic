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