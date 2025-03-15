import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // 添加超时设置
  timeout: 30000, // 30秒
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log(`API请求拦截器 - 发送请求: ${config.method?.toUpperCase()} ${config.url}`);
    
    // 尝试添加认证令牌
    if (typeof window !== 'undefined' && !config.headers['Authorization']) {
      try {
        // 从localStorage获取
        const authData = localStorage.getItem('hiic-hr-auth');
        if (authData) {
          const authObj = JSON.parse(authData);
          if (authObj.access_token) {
            config.headers['Authorization'] = `Bearer ${authObj.access_token}`;
            console.log('API请求拦截器 - 已添加认证令牌');
          }
        }
        // 如果localStorage中没有，尝试从全局变量获取
        else if (window.hiicHrSession?.access_token) {
          config.headers['Authorization'] = `Bearer ${window.hiicHrSession.access_token}`;
          console.log('API请求拦截器 - 已从全局变量添加认证令牌');
        }
      } catch (e) {
        console.error('API请求拦截器 - 添加认证令牌失败:', e);
      }
    }
    
    return config;
  },
  (error) => {
    console.error('API请求拦截器 - 请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log(`API响应拦截器 - 收到响应: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API响应拦截器 - 响应错误:', error);
    
    // 如果是401错误（未授权），可能是会话过期
    if (error.response && error.response.status === 401) {
      console.error('API响应拦截器 - 检测到未授权错误，可能是会话过期');
      
      // 不要自动重定向到登录页，而是返回明确的错误
      error.isAuthError = true;
      error.authMessage = '会话已过期，请重新登录';
      
      // 不清除会话信息，让应用层决定如何处理
    }
    
    return Promise.reject(error);
  }
);

// 员工相关API
export const employeeApi = {
  // 获取所有员工
  getAllEmployees: async () => {
    try {
      const response = await api.get('/employees');
      return response.data;
    } catch (error) {
      console.error('获取员工数据失败:', error);
      throw error;
    }
  },

  // 根据ID获取员工
  getEmployeeById: async (id: number) => {
    try {
      const response = await api.get(`/employees/${id}`);
      return response.data;
    } catch (error) {
      console.error(`获取员工ID ${id} 数据失败:`, error);
      throw error;
    }
  },

  // 根据部门获取员工
  getEmployeesByDepartment: async (department: string) => {
    try {
      const response = await api.get(`/departments/${department}/employees`);
      return response.data;
    } catch (error) {
      console.error(`获取部门 ${department} 员工数据失败:`, error);
      throw error;
    }
  },
};

// 统计数据API
export const statsApi = {
  // 获取统计数据
  getStats: async () => {
    try {
      const response = await api.get('/stats');
      return response.data;
    } catch (error) {
      console.error('获取统计数据失败:', error);
      throw error;
    }
  },
};

// 可视化API
export const visualizationApi = {
  // 获取所有可视化
  getAllVisualizations: async () => {
    try {
      const response = await api.get('/visualizations');
      return response.data;
    } catch (error) {
      console.error('获取可视化数据失败:', error);
      throw error;
    }
  },

  // 获取部门分布可视化
  getDepartmentVisualization: async () => {
    try {
      const response = await api.get('/visualizations/department');
      return response.data;
    } catch (error) {
      console.error('获取部门可视化数据失败:', error);
      throw error;
    }
  },

  // 获取性别分布可视化
  getGenderVisualization: async () => {
    try {
      const response = await api.get('/visualizations/gender');
      return response.data;
    } catch (error) {
      console.error('获取性别可视化数据失败:', error);
      throw error;
    }
  },

  // 获取年龄分布可视化
  getAgeVisualization: async () => {
    try {
      const response = await api.get('/visualizations/age');
      return response.data;
    } catch (error) {
      console.error('获取年龄可视化数据失败:', error);
      throw error;
    }
  },

  // 获取学历分布可视化
  getEducationVisualization: async () => {
    try {
      const response = await api.get('/visualizations/education');
      return response.data;
    } catch (error) {
      console.error('获取学历可视化数据失败:', error);
      throw error;
    }
  },
};

// 聊天API
export const chatApi = {
  // 发送聊天消息
  sendMessage: async (messages: Array<{role: string, content: string}>) => {
    try {
      console.log('API服务 - 发送聊天消息:', messages.length, '条消息');
      
      // 获取认证令牌
      let authToken = null;
      if (typeof window !== 'undefined') {
        // 尝试从localStorage获取认证令牌
        try {
          const authData = localStorage.getItem('hiic-hr-auth');
          if (authData) {
            const authObj = JSON.parse(authData);
            authToken = authObj.access_token;
            console.log('API服务 - 已从localStorage获取认证令牌');
          } else {
            console.log('API服务 - localStorage中未找到认证令牌');
          }
        } catch (e) {
          console.error('API服务 - 解析认证令牌失败:', e);
        }
        
        // 如果localStorage中没有，尝试从全局变量获取
        if (!authToken && window.hiicHrSession?.access_token) {
          authToken = window.hiicHrSession.access_token;
          console.log('API服务 - 已从全局变量获取认证令牌');
        }
      }
      
      // 设置请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // 如果有认证令牌，添加到请求头
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        console.log('API服务 - 已添加认证令牌到请求头');
      } else {
        console.log('API服务 - 未找到认证令牌，使用匿名请求');
      }
      
      // 发送请求
      console.log('API服务 - 开始发送请求到:', `${api.defaults.baseURL}/enhanced-chat`);
      const response = await api.post('/enhanced-chat', { messages }, { headers });
      console.log('API服务 - 请求成功，状态码:', response.status);
      
      return response.data;
    } catch (error: any) {
      console.error('API服务 - 发送聊天消息失败:', error);
      
      // 详细记录错误信息
      if (error.response) {
        // 服务器返回错误
        console.error('API服务 - 服务器错误:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        // 请求发送但没有收到响应
        console.error('API服务 - 无响应错误:', error.request);
      } else {
        // 请求设置时出错
        console.error('API服务 - 请求错误:', error.message);
      }
      
      // 重新抛出错误，但添加更多上下文
      throw {
        message: error.response?.data?.message || error.message || '发送聊天消息失败',
        originalError: error,
        status: error.response?.status
      };
    }
  },
  
  // 发送传统聊天消息（保留原始API以便回退）
  sendLegacyMessage: async (messages: Array<{role: string, content: string}>) => {
    try {
      console.log('API服务 - 发送传统聊天消息:', messages.length, '条消息');
      
      // 获取认证令牌
      let authToken = null;
      if (typeof window !== 'undefined') {
        // 尝试从localStorage获取认证令牌
        try {
          const authData = localStorage.getItem('hiic-hr-auth');
          if (authData) {
            const authObj = JSON.parse(authData);
            authToken = authObj.access_token;
            console.log('API服务 - 已从localStorage获取认证令牌');
          } else {
            console.log('API服务 - localStorage中未找到认证令牌');
          }
        } catch (e) {
          console.error('API服务 - 解析认证令牌失败:', e);
        }
        
        // 如果localStorage中没有，尝试从全局变量获取
        if (!authToken && window.hiicHrSession?.access_token) {
          authToken = window.hiicHrSession.access_token;
          console.log('API服务 - 已从全局变量获取认证令牌');
        }
      }
      
      // 设置请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // 如果有认证令牌，添加到请求头
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        console.log('API服务 - 已添加认证令牌到请求头');
      } else {
        console.log('API服务 - 未找到认证令牌，使用匿名请求');
      }
      
      // 发送请求
      console.log('API服务 - 开始发送请求到:', `${api.defaults.baseURL}/chat`);
      const response = await api.post('/chat', { messages }, { headers });
      console.log('API服务 - 请求成功，状态码:', response.status);
      
      return response.data;
    } catch (error: any) {
      console.error('API服务 - 发送聊天消息失败:', error);
      
      // 详细记录错误信息
      if (error.response) {
        // 服务器返回错误
        console.error('API服务 - 服务器错误:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        // 请求发送但没有收到响应
        console.error('API服务 - 无响应错误:', error.request);
      } else {
        // 请求设置时出错
        console.error('API服务 - 请求错误:', error.message);
      }
      
      // 重新抛出错误，但添加更多上下文
      throw {
        message: error.response?.data?.message || error.message || '发送聊天消息失败',
        originalError: error,
        status: error.response?.status
      };
    }
  }
};

export default api; 