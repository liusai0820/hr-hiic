'use client';

import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import { chatApi } from '@/api/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabaseClient';
import Image from 'next/image';
import { getAvatarByAgeAndGender } from '@/utils/avatarUtils';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    姓名?: string;
    性别?: string;
    年龄?: number;
    部门?: string;
    职位?: string;
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  source?: 'database' | 'knowledge_base' | 'unknown' | 'system';
  metadata?: {
    queryType?: 'sql' | 'general' | 'unknown' | 'system' | 'error';
    hasRealData: boolean;
    lastUpdated?: string;
    confidence: number;
  };
}

export default function ChatPage() {
  const { loading: authLoading, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '您好！我是中心HR助手 Cool ，请问有什么可以帮助您的？',
      source: 'system',
      metadata: {
        queryType: 'system',
        hasRealData: true,
        confidence: 1
      }
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [forceRender, setForceRender] = useState(false);
  const [localUser, setLocalUser] = useState<any>(null);
  const [showExamples, setShowExamples] = useState(true);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [requestInProgress, setRequestInProgress] = useState(false);

  // 移除原有的isLoading超时保护
  // 添加请求状态追踪
  useEffect(() => {
    if (!requestInProgress) {
      setIsLoading(false);
      setPageError(null);
    }
  }, [requestInProgress]);

  // 认证超时保护调整为10秒
  useEffect(() => {
    let authTimeoutId: NodeJS.Timeout | null = null;
    
    if (authLoading) {
      authTimeoutId = setTimeout(() => {
        console.log('聊天页面 - 检测到认证加载状态超时，强制渲染页面');
        setForceRender(true);
      }, 10000); // 10秒超时
    }
    
    return () => {
      if (authTimeoutId) clearTimeout(authTimeoutId);
    };
  }, [authLoading]);

  // 添加API健康检查
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        console.log('聊天页面 - 开始API健康检查');
        const isHealthy = await chatApi.checkHealth();
        console.log('聊天页面 - API健康状态:', isHealthy);
        setApiHealthy(isHealthy);
        
        if (!isHealthy) {
          console.log('聊天页面 - API服务不可用');
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: '系统检测到后端服务暂时无法访问。我们的技术团队已经收到通知，正在积极处理。请稍后再试。',
              source: 'system',
              metadata: {
                queryType: 'error',
                hasRealData: false,
                confidence: 1
              }
            }
          ]);
          
          // 启动自动重试机制
          startHealthCheckRetry();
        }
      } catch (error) {
        console.error('聊天页面 - 健康检查失败:', error);
        setApiHealthy(false);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: '无法连接到服务器。请检查您的网络连接，或稍后再试。',
            source: 'system',
            metadata: {
              queryType: 'error',
              hasRealData: false,
              confidence: 1
            }
          }
        ]);
      }
    };
    
    // 健康检查重试机制
    const startHealthCheckRetry = () => {
      let retryCount = 0;
      const maxRetries = 5;
      const retryInterval = 30000; // 30秒
      
      const retryId = setInterval(async () => {
        if (retryCount >= maxRetries) {
          clearInterval(retryId);
          return;
        }
        
        console.log(`聊天页面 - 第${retryCount + 1}次尝试重新连接API`);
        const isHealthy = await chatApi.checkHealth();
        
        if (isHealthy) {
          setApiHealthy(true);
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: '系统服务已恢复，您现在可以继续使用了。',
              source: 'system',
              metadata: {
                queryType: 'system',
                hasRealData: true,
                confidence: 1
              }
            }
          ]);
          clearInterval(retryId);
        }
        
        retryCount++;
      }, retryInterval);
      
      // 清理函数
      return () => clearInterval(retryId);
    };
    
    checkApiHealth();
  }, []);

  // 页面加载时检查认证状态
  useEffect(() => {
    // 检查是否有认证信息
    try {
      // 首先检查全局会话变量
      if (typeof window !== 'undefined' && window.hiicHrSession) {
        console.log('聊天页面 - 从全局变量获取会话');
        setLocalUser(window.hiicHrSession.user);
        
        // 确保localStorage和cookie也有会话信息
        const sessionStr = JSON.stringify(window.hiicHrSession);
        localStorage.setItem('hiic-hr-auth', sessionStr);
        localStorage.setItem('supabase.auth.token', sessionStr);
        document.cookie = `hiic-hr-auth=${encodeURIComponent(sessionStr)}; path=/; max-age=86400; SameSite=Lax`;
        
        // 确保Supabase会话也被设置
        try {
          supabase.auth.setSession({
            access_token: window.hiicHrSession.access_token || '',
            refresh_token: window.hiicHrSession.refresh_token || ''
          }).catch((e: Error) => {
            console.error('聊天页面 - 设置Supabase会话失败:', e);
          });
        } catch (e) {
          console.error('聊天页面 - 设置Supabase会话出错:', e);
        }
        
        console.log('聊天页面 - 已从全局变量同步会话到存储');
        return;
      }
      
      // 然后检查localStorage
      const authData = localStorage.getItem('hiic-hr-auth');
      if (!authData) {
        console.log('聊天页面 - 未检测到认证信息，可能需要登录');
        
        // 尝试从其他存储位置恢复
        const supabaseAuthData = localStorage.getItem('supabase.auth.token');
        if (supabaseAuthData) {
          console.log('聊天页面 - 从supabase.auth.token恢复会话');
          localStorage.setItem('hiic-hr-auth', supabaseAuthData);
          
          try {
            const userData = JSON.parse(supabaseAuthData);
            setLocalUser(userData.user || userData);
            
            // 设置cookie和全局变量
            document.cookie = `hiic-hr-auth=${encodeURIComponent(supabaseAuthData)}; path=/; max-age=86400; SameSite=Lax`;
            if (typeof window !== 'undefined') {
              window.hiicHrSession = userData;
              
              // 确保Supabase会话也被设置
              if (userData.access_token) {
                supabase.auth.setSession({
                  access_token: userData.access_token,
                  refresh_token: userData.refresh_token || ''
                }).catch((e: Error) => {
                  console.error('聊天页面 - 设置Supabase会话失败:', e);
                });
              }
            }
            
            console.log('聊天页面 - 已从备用存储恢复会话');
          } catch (parseError) {
            console.error('聊天页面 - 解析备用存储中的用户信息失败:', parseError);
          }
        } else {
          // 最后尝试从cookie恢复
          try {
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
              const [name, value] = cookie.trim().split('=');
              if (name === 'hiic-hr-auth' && value) {
                console.log('聊天页面 - 从cookie恢复会话');
                const decodedValue = decodeURIComponent(value);
                localStorage.setItem('hiic-hr-auth', decodedValue);
                localStorage.setItem('supabase.auth.token', decodedValue);
                
                try {
                  const userData = JSON.parse(decodedValue);
                  setLocalUser(userData.user || userData);
                  
                  if (typeof window !== 'undefined') {
                    window.hiicHrSession = userData;
                    
                    // 确保Supabase会话也被设置
                    if (userData.access_token) {
                      supabase.auth.setSession({
                        access_token: userData.access_token,
                        refresh_token: userData.refresh_token || ''
                      }).catch((e: Error) => {
                        console.error('聊天页面 - 设置Supabase会话失败:', e);
                      });
                    }
                  }
                  
                  console.log('聊天页面 - 已从cookie恢复会话');
                  break;
                } catch (parseError) {
                  console.error('聊天页面 - 解析cookie中的用户信息失败:', parseError);
                }
              }
            }
          } catch (cookieError) {
            console.error('聊天页面 - 从cookie恢复会话失败:', cookieError);
          }
        }
      } else {
        console.log('聊天页面 - 检测到认证信息，用户已登录');
        try {
          const userData = JSON.parse(authData);
          setLocalUser(userData.user || userData);
          console.log('聊天页面 - 从localStorage加载用户信息成功');
          
          // 确保cookie中也有会话信息
          if (!document.cookie.includes('hiic-hr-auth')) {
            console.log('聊天页面 - Cookie中没有会话信息，重新设置');
            document.cookie = `hiic-hr-auth=${encodeURIComponent(authData)}; path=/; max-age=86400; SameSite=Lax`;
          }
          
          // 同步到supabase.auth.token
          if (!localStorage.getItem('supabase.auth.token')) {
            localStorage.setItem('supabase.auth.token', authData);
            console.log('聊天页面 - 已同步会话到supabase.auth.token');
          }
          
          // 同步到全局变量
          if (typeof window !== 'undefined') {
            window.hiicHrSession = userData;
            console.log('聊天页面 - 已同步会话到全局变量');
            
            // 确保Supabase会话也被设置
            if (userData.access_token) {
              supabase.auth.setSession({
                access_token: userData.access_token,
                refresh_token: userData.refresh_token || ''
              }).catch((e: Error) => {
                console.error('聊天页面 - 设置Supabase会话失败:', e);
              });
            }
          }
        } catch (parseError) {
          console.error('聊天页面 - 解析localStorage中的用户信息失败:', parseError);
        }
      }
    } catch (e) {
      console.error('聊天页面 - 检查认证状态出错:', e);
    }
  }, []);

  // 添加获取时间段的useEffect
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setTimeOfDay('morning');
    } else if (hour >= 12 && hour < 18) {
      setTimeOfDay('afternoon');
    } else {
      setTimeOfDay('evening');
    }
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || requestInProgress || !apiHealthy) {
      if (!apiHealthy) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: '抱歉，系统当前无法处理您的请求。请等待服务恢复后再试。',
            source: 'system',
            metadata: {
              queryType: 'error',
              hasRealData: false,
              confidence: 1
            }
          }
        ]);
      }
      return;
    }

    setShowExamples(false);
    setPageError(null);
    setIsLoading(true);
    setRequestInProgress(true);

    const userMessage: Message = { 
      role: 'user', 
      content: input,
      metadata: {
        queryType: 'unknown',
        hasRealData: true,
        confidence: 1
      }
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    const apiMessages = messages.concat(userMessage).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 优化的重试配置
    const maxRetries = 3;
    const baseTimeout = 90000;
    const maxTimeout = 240000;
    let currentTry = 0;

    const sendWithTimeout = async (timeout: number): Promise<any> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await Promise.race([
          chatApi.sendMessage(apiMessages),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('请求超时')), timeout)
          )
        ]);
        
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    try {
      while (currentTry <= maxRetries) {
        try {
          console.log(`聊天页面 - 第${currentTry + 1}次尝试发送消息`);
          
          const timeout = Math.min(baseTimeout * (currentTry + 1), maxTimeout);
          console.log(`聊天页面 - 当前超时设置: ${timeout/1000}秒`);
          
          const response = await sendWithTimeout(timeout);
          
          if (!response || !response.data) {
            throw new Error('暂无相关数据');
          }

          // 验证响应数据的可信度
          const { content, metadata } = response.data;
          
          if (!metadata?.hasRealData) {
            throw new Error('无法提供准确数据');
          }

          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: content,
            source: metadata.source || 'unknown',
            metadata: {
              queryType: metadata.queryType || 'unknown',
              hasRealData: metadata.hasRealData,
              lastUpdated: metadata.lastUpdated,
              confidence: metadata.confidence || 0
            }
          }]);
          break;

        } catch (error: any) {
          console.error(`聊天页面 - 第${currentTry + 1}次尝试失败:`, error);

          if (currentTry === maxRetries) {
            throw error;
          }

          const waitTime = Math.min(3000 * (currentTry + 1), 15000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          currentTry++;
        }
      }
    } catch (error: any) {
      let errorMessage = '抱歉，我暂时无法回答这个问题。';
      
      if (error.name === 'AbortError' || error.message === '请求超时') {
        errorMessage = '抱歉，这个问题需要较长处理时间。建议：\n' +
          '1. 稍后重试\n' +
          '2. 将问题拆分得更具体\n' +
          '3. 检查网络连接';
      } else if (error.message.includes('数据库')) {
        errorMessage = '数据库访问异常，请稍后再试。';
      } else if (error.message.includes('权限')) {
        errorMessage = '您可能没有权限访问这些信息。';
      } else if (error.message.includes('无法提供准确数据')) {
        errorMessage = '抱歉，我无法为这个问题提供准确的数据。请尝试询问具体的、可查询的信息。';
      } else if (error.message.includes('无数据')) {
        errorMessage = '未找到相关数据。如有疑问，请联系管理员。';
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: errorMessage,
        source: 'system',
        metadata: {
          queryType: 'error',
          hasRealData: false,
          confidence: 0
        }
      }]);
    } finally {
      setIsLoading(false);
      setRequestInProgress(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 示例问题选择处理函数
  const handleExampleClick = (question: string) => {
    setInput(question);
  };

  // 从用户元数据中获取性别和年龄
  const getUserMetadata = (user: User | null) => {
    if (!user?.user_metadata) return { gender: '男', age: 30 };
    const { 性别, 年龄 } = user.user_metadata;
    return {
      gender: 性别 || '男',
      age: 年龄 || 30
    };
  };

  // 更高级的示例问题
  const advancedExamples = [
    '查看25岁以下员工名单',
    '统计各部门人数',
    '多少人是水瓶座',
    '今年有哪些人将达成司龄10年成就'
  ];

  // 如果页面出错，显示错误信息和重试按钮
  if (pageError) {
    return (
      <PageLayout>
        <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center">
          <div className="text-red-500 mb-4">{pageError}</div>
          <button 
            className="btn-primary" 
            onClick={() => window.location.reload()}
          >
            刷新页面
          </button>
        </div>
      </PageLayout>
    );
  }

  // 如果API不健康，显示提示
  if (apiHealthy === false) {
    return (
      <PageLayout>
        <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center">
          <div className="text-red-500 mb-4">API服务不可用，请稍后再试</div>
          <button 
            className="btn-primary" 
            onClick={() => window.location.reload()}
          >
            重试
          </button>
        </div>
      </PageLayout>
    );
  }

  // 如果认证正在加载且未强制渲染，显示加载状态
  if (authLoading && !forceRender && !localUser) {
    return (
      <PageLayout>
        <div className="w-full min-h-[calc(100vh-var(--header-height))] flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // 如果没有用户且没有本地用户，显示未登录提示
  if (!user && !localUser && !authLoading) {
    return (
      <PageLayout>
        <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center">
          <div className="text-xl font-semibold mb-4">欢迎使用HIIC HR聊天助手</div>
          <div className="text-gray-600 mb-6 max-w-md text-center">
            您当前未登录或登录会话已过期。您可以选择登录以使用所有功能，或作为访客继续使用有限功能。
          </div>
          <div className="flex space-x-4">
            <button 
              className="btn-primary" 
              onClick={() => window.location.href = '/login?redirect=/chat'}
            >
              登录账号
            </button>
            <button 
              className="btn-secondary"
              onClick={() => {
                // 模拟一个本地访客用户
                const guestUser = {
                  id: 'guest-' + Date.now(),
                  email: 'guest@hiic.com',
                  user_metadata: {
                    姓名: '访客用户',
                    role: 'guest'
                  }
                };
                setLocalUser(guestUser);
                
                // 显示访客模式提示
                setMessages(prev => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: '您正在以访客模式使用聊天功能。某些需要登录的功能可能无法使用。如需完整体验，请登录您的账号。',
                    source: 'system',
                    metadata: {
                      queryType: 'system',
                      hasRealData: false,
                      confidence: 1
                    }
                  }
                ]);
              }}
            >
              访客模式
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        {/* 顶部导航栏 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="content-container py-6">
            <h1 className="text-2xl font-bold">AI 智能助手</h1>
            <p className="mt-1 text-sm text-blue-100">为您提供专业的人力资源解答</p>
          </div>
        </div>
        
        {/* 主体内容区 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧历史记录 */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hidden lg:block">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">历史记录</h3>
              </div>
              
              {/* 聊天历史 */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {messages.map((msg, index) => (
                    msg.role === 'user' && (
                      <div
                        key={index}
                        onClick={() => handleExampleClick(msg.content)}
                        className="p-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md cursor-pointer truncate"
                      >
                        {msg.content}
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* 系统状态 */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-xs">
                  {apiHealthy ? (
                    <>
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      <span className="text-green-500">系统运行正常</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      <span className="text-red-500">系统异常</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 中间聊天区域 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 消息列表区域 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-3xl mx-auto">
                {/* 欢迎信息 */}
                {messages.length === 1 && (
                  <div className="text-center my-8">
                    <h2 className="text-3xl font-medium mb-8">
                      <span className="text-green-600">Good</span> <span className="text-gray-400">{timeOfDay}</span>
                      <span className="text-gray-600">, {user?.user_metadata?.姓名 || user?.email?.split('@')[0] || 'Guest'}</span>!
                    </h2>
                    
                    {/* 示例问题 */}
                    {showExamples && (
                      <div className="max-w-2xl mx-auto grid grid-cols-2 gap-4 px-4">
                        {advancedExamples.map((question, index) => (
                          <button
                            key={index}
                            onClick={() => handleExampleClick(question)}
                            className="text-center p-3 text-sm text-gray-600 bg-white/90 hover:bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 backdrop-blur-sm w-full"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 对话消息 */}
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <div 
                      key={index} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="h-8 w-8 rounded-full bg-blue-600 flex-shrink-0 mr-3 flex items-center justify-center">
                          <Image 
                            src="/images/animal_chara_radio_penguin.png" 
                            alt="HR助手" 
                            width={32} 
                            height={32}
                            className="rounded-full"
                          />
                        </div>
                      )}
                      <div 
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                        {message.role === 'assistant' && message.metadata && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {message.metadata.hasRealData ? (
                              <span className="text-green-600">✓ 数据来源可信</span>
                            ) : (
                              <span className="text-yellow-600">⚠️ 仅供参考</span>
                            )}
                            {message.metadata.lastUpdated && (
                              <span className="ml-2">
                                更新时间: {new Date(message.metadata.lastUpdated).toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {message.role === 'user' && (
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex-shrink-0 ml-3 flex items-center justify-center">
                          <Image 
                            src={getAvatarByAgeAndGender(
                              getUserMetadata(user || localUser).age,
                              getUserMetadata(user || localUser).gender
                            )} 
                            alt="用户" 
                            width={32} 
                            height={32}
                            className="rounded-full"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 加载状态 */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex-shrink-0 mr-3 flex items-center justify-center">
                        <Image 
                          src="/images/animal_chara_radio_penguin.png" 
                          alt="HR助手" 
                          width={32} 
                          height={32}
                          className="rounded-full"
                        />
                      </div>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 输入区域 */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入您的问题..."
                    className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 bg-white dark:bg-gray-900"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      isLoading || !input.trim()
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 