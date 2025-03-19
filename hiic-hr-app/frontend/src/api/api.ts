import axios from 'axios';

// 修改API基础URL，移除/api后缀
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 70000, // 70秒超时，与后端MODEL_TIMEOUT(60秒)保持一致并增加缓冲
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器
apiClient.interceptors.request.use(
  (config) => {
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
    return Promise.reject(error);
  }
);

// 添加响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 处理超时错误
    if (error.code === 'ECONNABORTED' && error.message && error.message.includes('timeout')) {
      console.error('请求超时:', error.config.url);
      // 返回更友好的错误信息
      return Promise.reject({
        ...error,
        friendly_message: '请求处理超时，这可能是因为您的问题较为复杂。请稍后再试，或尝试简化您的问题。'
      });
    }
    
    // 如果是401错误且未尝试过重试
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // 尝试刷新token
      try {
        // 这里可以添加刷新token的逻辑
        console.log('尝试刷新token');
        
        // 重新发送原始请求
        return apiClient(originalRequest);
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
  // 发送消息（传统方式）
  sendMessage: async (messages: ChatMessage[]): Promise<string> => {
    try {
      console.log('API服务 - 发送聊天消息:', messages);
      const response = await apiClient.post<ChatResponse>(`/chat/send`, {
        messages
      });
      console.log('API服务 - 收到响应:', response.data);
      return response.data.response;
    } catch (error: any) {
      console.error('API服务 - 发送消息失败:', error);
      // 返回友好错误消息
      if (error.friendly_message) {
        return `抱歉，${error.friendly_message}`;
      }
      return "抱歉，在处理您的请求时出现了问题。请稍后再试，或尝试提问其他问题。";
    }
  },
  
  // 发送增强消息（工具调用方式）
  sendEnhancedMessage: async (messages: ChatMessage[]): Promise<string> => {
    try {
      console.log('API服务 - 发送增强聊天消息:', messages);
      const response = await apiClient.post<ChatResponse>(`/chat/enhanced/send`, {
        messages
      });
      console.log('API服务 - 收到响应:', response.data);
      return response.data.response;
    } catch (error: any) {
      console.error('API服务 - 发送增强消息失败:', error);
      // 返回友好错误消息
      if (error.friendly_message) {
        return `抱歉，${error.friendly_message}`;
      }
      return "抱歉，在处理您的请求时出现了问题。请稍后再试，或尝试提问其他问题。";
    }
  },
  
  // 发送混合消息（工具调用+SQL方式）
  sendHybridMessage: async (messages: ChatMessage[]): Promise<string> => {
    try {
      console.log('API服务 - 发送混合聊天消息:', messages);
      const response = await apiClient.post<ChatResponse>(`/chat/hybrid/send`, {
        messages
      });
      console.log('API服务 - 收到响应:', response.data);
      return response.data.response;
    } catch (error: any) {
      console.error('API服务 - 发送混合消息失败:', error);
      // 返回友好错误消息
      if (error.friendly_message) {
        return `抱歉，${error.friendly_message}`;
      }
      return "抱歉，在处理您的请求时出现了问题。请稍后再试，或尝试提问其他问题。";
    }
  },
  
  // 检查API健康状态
  checkHealth: async (): Promise<boolean> => {
    try {
      console.log('API服务 - 检查健康状态');
      const response = await apiClient.get(`/chat/health`);
      console.log('API服务 - 健康检查响应:', response.status);
      return response.status === 200;
    } catch (error) {
      console.error('API服务 - 健康检查失败:', error);
      return false;
    }
  }
}; 