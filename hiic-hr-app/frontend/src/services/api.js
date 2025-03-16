// 获取所有可视化数据
export const getAllVisualizations = async () => {
  try {
    const response = await fetch('/api/visualizations');
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
    const response = await fetch(`/api/visualizations/employees/${visualizationType}?category=${encodeURIComponent(category)}`);
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

// 导出可视化API
export const visualizationApi = {
  getAllVisualizations,
  getVisualizationEmployees
}; 