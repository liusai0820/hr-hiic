import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Avatar, 
  CircularProgress,
  IconButton,
  Snackbar,
  Alert,
  Chip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { styled } from '@mui/material/styles';
import { chatApi } from '../api/api';
import { ChatMessage } from '../types/chat';
import ReactMarkdown from 'react-markdown';

// 样式化组件
const ChatContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  maxHeight: 'calc(100vh - 120px)',
  padding: theme.spacing(2),
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflowY: 'auto',
  marginBottom: theme.spacing(2),
  padding: theme.spacing(1),
}));

const MessageBubble = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isUser',
})<{ isUser: boolean }>(({ theme, isUser }) => ({
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5),
  maxWidth: '80%',
  borderRadius: 16,
  backgroundColor: isUser ? theme.palette.primary.light : theme.palette.grey[100],
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  wordBreak: 'break-word',
}));

const InputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  flexGrow: 1,
  marginRight: theme.spacing(1),
}));

const MessageRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  marginBottom: theme.spacing(1.5),
  alignItems: 'flex-start',
}));

const AvatarContainer = styled(Box)(({ theme }) => ({
  marginRight: theme.spacing(1),
  marginTop: theme.spacing(0.5),
}));

const MessageContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  maxWidth: 'calc(100% - 50px)',
}));

const LoadingIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  margin: theme.spacing(1, 0),
}));

// 聊天组件
const Chat: React.FC = () => {
  // 状态
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '您好！我是HIIC公司的HR助手小智。有什么我可以帮您了解的吗？无论是查询员工信息还是部门情况，我都很乐意为您服务。'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDuration, setLoadingDuration] = useState(0);
  const [healthCheckStatus, setHealthCheckStatus] = useState<boolean | null>(null);
  
  // 引用
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 初始化时检查API健康状态
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const isHealthy = await chatApi.checkHealth();
        setHealthCheckStatus(isHealthy);
      } catch (error) {
        console.error('健康检查失败:', error);
        setHealthCheckStatus(false);
      }
    };
    
    checkHealth();
  }, []);
  
  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 当消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // 更新加载计时器
  useEffect(() => {
    if (isLoading) {
      loadingTimerRef.current = setInterval(() => {
        setLoadingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
        setLoadingDuration(0);
      }
    }
    
    return () => {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
    };
  }, [isLoading]);
  
  // 发送消息
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: input
    };
    
    // 添加用户消息到消息列表
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      // 使用混合聊天服务
      const response = await chatApi.sendHybridMessage([...messages, userMessage]);
      
      // 添加AI回复到消息列表
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: response
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('发送消息失败:', error);
      
      // 设置错误消息
      setError(error.message || '发送消息失败');
      
      // 如果是API已经处理过的错误，直接显示返回的消息
      if (typeof error === 'string') {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: error
        };
        setMessages(prev => [...prev, errorMessage]);
      } else {
        // 否则显示通用错误消息
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: '抱歉，处理您的请求时出现了问题。请稍后再试，或尝试提问其他问题。'
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // 处理按键事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // 关闭错误提示
  const handleCloseError = () => {
    setError(null);
  };
  
  return (
    <ChatContainer>
      {healthCheckStatus === false && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          系统连接不稳定，可能会影响使用体验。请稍后再试。
        </Alert>
      )}
      
      <MessagesContainer>
        {messages.map((message, index) => (
          <MessageRow key={index} sx={{ justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {message.role !== 'user' && (
              <AvatarContainer>
                <Avatar sx={{ bgcolor: 'primary.main' }}>AI</Avatar>
              </AvatarContainer>
            )}
            <MessageContent>
              <MessageBubble isUser={message.role === 'user'}>
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </MessageBubble>
            </MessageContent>
            {message.role === 'user' && (
              <AvatarContainer sx={{ marginLeft: 1, marginRight: 0 }}>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>用户</Avatar>
              </AvatarContainer>
            )}
          </MessageRow>
        ))}
        
        {isLoading && (
          <LoadingIndicator>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              正在思考
              {loadingDuration > 10 && "（复杂问题可能需要更长时间）"}
              {loadingDuration > 30 && "（仍在处理中，请耐心等待）"}
            </Typography>
            {loadingDuration > 5 && (
              <Chip 
                label={`${loadingDuration}秒`} 
                size="small" 
                sx={{ ml: 1 }} 
                variant="outlined"
              />
            )}
          </LoadingIndicator>
        )}
        
        <div ref={messagesEndRef} />
      </MessagesContainer>
      
      <InputContainer>
        <StyledTextField
          variant="outlined"
          placeholder="输入您的问题..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          multiline
          maxRows={4}
        />
        <IconButton 
          color="primary" 
          onClick={sendMessage} 
          disabled={isLoading || !input.trim()}
          size="large"
        >
          {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
        </IconButton>
      </InputContainer>
      
      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseError}>
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </ChatContainer>
  );
};

export default Chat; 