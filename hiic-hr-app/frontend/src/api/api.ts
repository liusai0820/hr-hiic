// 聊天API
export const chatApi = {
  // 发送消息（传统方式）
  sendMessage: async (messages: ChatMessage[]): Promise<string> => {
    try {
      const response = await axios.post<ChatResponse>(`${API_BASE_URL}/chat/send`, {
        messages
      });
      return response.data.response;
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  },
  
  // 发送增强消息（工具调用方式）
  sendEnhancedMessage: async (messages: ChatMessage[]): Promise<string> => {
    try {
      const response = await axios.post<ChatResponse>(`${API_BASE_URL}/chat/enhanced/send`, {
        messages
      });
      return response.data.response;
    } catch (error) {
      console.error('发送增强消息失败:', error);
      throw error;
    }
  },
  
  // 发送混合消息（工具调用+SQL方式）
  sendHybridMessage: async (messages: ChatMessage[]): Promise<string> => {
    try {
      const response = await axios.post<ChatResponse>(`${API_BASE_URL}/chat/hybrid/send`, {
        messages
      });
      return response.data.response;
    } catch (error) {
      console.error('发送混合消息失败:', error);
      throw error;
    }
  }
}; 