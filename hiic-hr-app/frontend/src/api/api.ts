import axios from 'axios';

// 统一使用环境变量中的 API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  console.error('警告: NEXT_PUBLIC_API_URL 未设置');
}

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 70000, // 70秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 记录请求信息
    console.log('API请求:', {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL,
      timestamp: new Date().toISOString()
    });

    // 从localStorage获取token
    const authData = localStorage.getItem('hiic-hr-auth');
    if (authData) {
      try {
        const userData = JSON.parse(authData);
        if (userData.access_token) {
          config.headers['Authorization'] = `Bearer ${userData.access_token}`;
        }
      } catch (e) {
        console.error('解析认证数据失败:', e);
      }
    }
    return config;
  },
  (error) => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 添加响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    // 记录响应信息
    console.log('API响应:', {
      url: response.config.url,
      status: response.status,
      timestamp: new Date().toISOString()
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 详细的错误日志
    console.error('API错误:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      message: error.message,
      timestamp: new Date().toISOString(),
      data: error.response?.data
    });

    // 处理超时错误
    if (error.code === 'ECONNABORTED' && error.message?.includes('timeout')) {
      return Promise.reject({
        ...error,
        friendly_message: '请求处理超时，这可能是因为您的问题较为复杂。请稍后再试，或尝试简化您的问题。'
      });
    }
    
    // 处理401错误
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // 尝试刷新token
        const authData = localStorage.getItem('hiic-hr-auth');
        if (authData) {
          const userData = JSON.parse(authData);
          if (userData.refresh_token) {
            // 这里添加刷新token的逻辑
            console.log('尝试刷新token');
            // 重新发送原始请求
            return apiClient(originalRequest);
          }
        }
        throw new Error('无法刷新token');
      } catch (refreshError) {
        console.error('刷新token失败:', refreshError);
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// 定义聊天消息类型
interface ChatMessage {
  role: string;
  content: string;
}

// 定义聊天响应类型
interface ChatResponse {
  response: string;
}

// 聊天API
export const chatApi = {
  // 检查API健康状态
  checkHealth: async (): Promise<boolean> => {
    try {
      console.log('API服务 - 开始健康检查');
      console.log('API服务 - 当前API基础URL:', API_BASE_URL);
      
      const response = await apiClient.get('/api/chat/health');
      
      console.log('API服务 - 健康检查成功:', {
        status: response.status,
        timestamp: new Date().toISOString()
      });
      
      return response.status === 200;
    } catch (error: any) {
      console.error('API服务 - 健康检查失败:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        timestamp: new Date().toISOString()
      });
      return false; // 明确返回false表示健康检查失败
    }
  },

  // 发送消息（统一处理方式）
  sendMessage: async (messages: ChatMessage[]): Promise<string> => {
    try {
      console.log('API服务 - 发送聊天消息:', {
        messagesCount: messages.length,
        timestamp: new Date().toISOString()
      });

      const response = await apiClient.post<ChatResponse>('/api/chat/send', {
        messages
      });

      console.log('API服务 - 收到响应:', {
        status: response.status,
        timestamp: new Date().toISOString()
      });

      return response.data.response;
    } catch (error: any) {
      console.error('API服务 - 发送消息失败:', {
        error: error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      });

      if (error.friendly_message) {
        return `抱歉，${error.friendly_message}`;
      }

      // 根据错误类型返回具体的错误信息
      if (error.response?.status === 401) {
        return "您的登录会话可能已过期，请重新登录后再试。";
      } else if (error.response?.status === 503) {
        return "服务器当前正在维护或暂时无法访问，请稍后再试。";
      } else if (error.code === 'ECONNABORTED') {
        return "请求处理超时，请稍后重试或简化您的问题。";
      }

      return "抱歉，处理您的请求时遇到了问题。请稍后再试。";
    }
  },
  
  // 发送增强消息（工具调用方式）
  sendEnhancedMessage: async (messages: ChatMessage[]): Promise<string> => {
    try {
      console.log('API服务 - 发送增强聊天消息:', {
        messagesCount: messages.length,
        timestamp: new Date().toISOString()
      });
      
      const response = await apiClient.post<ChatResponse>('/api/chat/enhanced/send', {
        messages
      });
      
      console.log('API服务 - 收到响应:', {
        status: response.status,
        timestamp: new Date().toISOString()
      });
      
      return response.data.response;
    } catch (error: any) {
      console.error('API服务 - 发送增强消息失败:', {
        error: error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      });
      
      if (error.friendly_message) {
        return `抱歉，${error.friendly_message}`;
      }
      
      // 根据错误类型返回具体的错误信息
      if (error.response?.status === 401) {
        return "您的登录会话可能已过期，请重新登录后再试。";
      } else if (error.response?.status === 503) {
        return "服务器当前正在维护或暂时无法访问，请稍后再试。";
      } else if (error.code === 'ECONNABORTED') {
        return "请求处理超时，请稍后重试或简化您的问题。";
      }
      
      return "抱歉，处理您的请求时遇到了问题。请稍后再试。";
    }
  },
  
  // 发送混合消息（工具调用+SQL方式）
  sendHybridMessage: async (messages: ChatMessage[]): Promise<string> => {
    try {
      console.log('API服务 - 发送混合聊天消息:', {
        messagesCount: messages.length,
        timestamp: new Date().toISOString()
      });
      
      const response = await apiClient.post<ChatResponse>('/api/chat/hybrid/send', {
        messages
      });
      
      console.log('API服务 - 收到响应:', {
        status: response.status,
        timestamp: new Date().toISOString()
      });
      
      return response.data.response;
    } catch (error: any) {
      console.error('API服务 - 发送混合消息失败:', {
        error: error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      });
      
      if (error.friendly_message) {
        return `抱歉，${error.friendly_message}`;
      }
      
      // 根据错误类型返回具体的错误信息
      if (error.response?.status === 401) {
        return "您的登录会话可能已过期，请重新登录后再试。";
      } else if (error.response?.status === 503) {
        return "服务器当前正在维护或暂时无法访问，请稍后再试。";
      } else if (error.code === 'ECONNABORTED') {
        return "请求处理超时，请稍后重试或简化您的问题。";
      }
      
      return "抱歉，处理您的请求时遇到了问题。请稍后再试。";
    }
  },
};

// 员工数据 API
export const employeeApi = {
  // 获取所有员工
  getAllEmployees: async () => {
    try {
      console.log('API服务 - 开始获取员工数据');
      const response = await apiClient.get('/api/employees/');
      
      if (response.status !== 200) {
        throw new Error(`获取员工数据失败: ${response.status}`);
      }
      
      console.log(`API服务 - 成功获取${response.data.length}条员工数据`);
      return response.data;
    } catch (error: any) {
      console.error('API服务 - 获取员工数据失败:', error);
      throw new Error(error.message || '获取员工数据失败');
    }
  },

  // 根据类别获取员工
  getEmployeesByCategory: async (type: string, category: string) => {
    try {
      console.log(`API服务 - 开始获取${type}类别下的${category}员工数据`);
      const response = await apiClient.get(`/api/employees/${type}/${encodeURIComponent(category)}`);
      
      if (response.status !== 200) {
        throw new Error(`获取员工数据失败: ${response.status}`);
      }
      
      console.log(`API服务 - 成功获取${response.data.length}条员工数据`);
      return response.data;
    } catch (error: any) {
      console.error('API服务 - 获取员工数据失败:', error);
      throw new Error(error.message || '获取员工数据失败');
    }
  }
}; 