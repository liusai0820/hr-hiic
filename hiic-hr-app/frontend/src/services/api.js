// 获取所有可视化数据
export const getAllVisualizations = async () => {
  try {
    const response = await fetch('/api/api/visualizations');
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
    const response = await fetch(`/api/api/visualizations/employees/${visualizationType}?category=${encodeURIComponent(category)}`);
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
    const response = await fetch('/api/employees');
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
    const response = await fetch('/api/api/visualizations/stats');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '获取统计数据失败');
    }
    return await response.json();
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