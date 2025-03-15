import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Avatar, 
  CircularProgress,
  IconButton
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
  
  // 引用
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 当消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
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
    
    try {
      // 使用混合聊天服务
      const response = await chatApi.sendHybridMessage([...messages, userMessage]);
      
      // 添加AI回复到消息列表
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: response
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('发送消息失败:', error);
      // 添加错误消息
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '抱歉，处理您的请求时出现了问题。请稍后再试。'
      };
      setMessages(prev => [...prev, errorMessage]);
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
  
  return (
    <ChatContainer>
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
    </ChatContainer>
  );
};

export default Chat; 