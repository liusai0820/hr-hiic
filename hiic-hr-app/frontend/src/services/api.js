// 获取所有可视化数据
export const getAllVisualizations = async () => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hr-hiic-production.up.railway.app';
    const response = await fetch(`${apiUrl}/api/api/visualizations/`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '获取可视化数据失败');
    }
    return await response.json();
  } catch (error) {
    console.error('获取可视化数据失败:', error);
    throw error;
  }
};

// 获取特定可视化分类下的员工列表
export const getVisualizationEmployees = async (visualizationType, category) => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hr-hiic-production.up.railway.app';
    const response = await fetch(`${apiUrl}/api/api/visualizations/employees/${visualizationType}?category=${encodeURIComponent(category)}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '获取员工列表失败');
    }
    return await response.json();
  } catch (error) {
    console.error('获取员工列表失败:', error);
    throw error;
  }
};

// 获取所有员工数据
export const getAllEmployees = async () => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hr-hiic-production.up.railway.app';
    const response = await fetch(`${apiUrl}/api/employees`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '获取员工数据失败');
    }
    return await response.json();
  } catch (error) {
    console.error('获取员工数据失败:', error);
    throw error;
  }
};

// 获取统计数据
export const getStats = async () => {
  try {
    // 直接从可视化数据中获取统计信息，而不是尝试访问单独的统计接口
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hr-hiic-production.up.railway.app';
    const response = await fetch(`${apiUrl}/api/api/visualizations/`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '获取统计数据失败');
    }
    
    // 获取可视化数据
    const visualizationsData = await response.json();
    
    // 从可视化数据中提取统计信息并构造统计数据对象
    const statsData = {
      departments: Object.keys(visualizationsData.department?.data || {}),
      employeeCount: visualizationsData.gender?.stats?.总人数 || 0,
      departmentCount: visualizationsData.department?.stats?.部门总数 || 0,
      averageAge: visualizationsData.age?.stats?.平均年龄 || 0,
      genderRatio: {
        male: visualizationsData.gender?.stats?.男性比例 || 0,
        female: visualizationsData.gender?.stats?.女性比例 || 0
      }
    };
    
    return statsData;
  } catch (error) {
    console.error('获取统计数据失败:', error);
    throw error;
  }
};

// 导出可视化API
export const visualizationApi = {
  getAllVisualizations,
  getVisualizationEmployees
};

// 导出员工API
export const employeeApi = {
  getAllEmployees
};

// 导出统计API
export const statsApi = {
  getStats
}; 