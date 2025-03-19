'use client';

import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import { chatApi } from '@/api/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
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
}

export default function ChatPage() {
  const { loading: authLoading, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '您好！我是中心HR助手 Cool ，请问有什么可以帮助您的？'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [forceRender, setForceRender] = useState(false);
  const [localUser, setLocalUser] = useState<any>(null);
  const [showExamples, setShowExamples] = useState(true);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  // 添加超时保护，防止页面卡在加载状态
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (isLoading) {
      timeoutId = setTimeout(() => {
        console.log('聊天页面 - 检测到加载状态超时，自动重置');
        setIsLoading(false);
        setPageError('请求超时，请重试');
      }, 15000); // 15秒超时
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading]);

  // 添加认证加载超时保护
  useEffect(() => {
    let authTimeoutId: NodeJS.Timeout | null = null;
    
    if (authLoading) {
      authTimeoutId = setTimeout(() => {
        console.log('聊天页面 - 检测到认证加载状态超时，强制渲染页面');
        setForceRender(true);
      }, 3000); // 3秒超时
    }
    
    return () => {
      if (authTimeoutId) clearTimeout(authTimeoutId);
    };
  }, [authLoading]);

  // 添加API健康检查
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        console.log('聊天页面 - 检查API健康状态');
        const isHealthy = await chatApi.checkHealth();
        console.log('聊天页面 - API健康状态:', isHealthy);
        setApiHealthy(isHealthy);
        
        if (!isHealthy) {
          setPageError('API服务不可用，请稍后再试');
        }
      } catch (error) {
        console.error('聊天页面 - 检查API健康状态失败:', error);
        setApiHealthy(false);
        setPageError('无法连接到API服务，请检查网络连接');
      }
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

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // 隐藏示例问题
    setShowExamples(false);
    
    // 重置错误状态
    setPageError(null);
    
    // 添加用户消息
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log('聊天页面 - 准备发送消息:', input);
      
      // 准备发送到API的消息格式
      const apiMessages = messages.concat(userMessage).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // 添加超时处理
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
      
      try {
        // 调用API
        console.log('聊天页面 - 开始调用聊天API');
        
        // 使用try-catch包装API调用，防止未捕获的错误导致页面跳转
        let response;
        try {
          response = await chatApi.sendMessage(apiMessages);
          console.log('聊天页面 - API调用成功:', response);
        } catch (apiCallError: any) {
          console.error('聊天页面 - API调用出错:', apiCallError);
          throw new Error(`API调用失败: ${apiCallError.message || '未知错误'}`);
        }
        
        clearTimeout(timeoutId);
        
        if (!response) {
          console.error('聊天页面 - API返回空响应');
          throw new Error('服务器返回空响应');
        }
        
        // 添加AI回复
        console.log('聊天页面 - 添加AI回复到消息列表');
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      } catch (apiError: any) {
        clearTimeout(timeoutId);
        console.error('聊天页面 - API错误:', apiError);
        
        if (apiError.name === 'AbortError') {
          console.error('聊天页面 - API请求超时');
          setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，请求超时。请检查您的网络连接并重试。' }]);
        } else {
          // 显示具体错误信息
          const errorMessage = apiError.response?.data?.message || apiError.message || '未知错误';
          console.error('聊天页面 - 详细错误信息:', errorMessage);
          setMessages(prev => [...prev, { role: 'assistant', content: `抱歉，发生错误: ${errorMessage}` }]);
        }
      }
    } catch (error: any) {
      console.error('聊天页面 - 发送消息失败:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，我遇到了一些问题，无法回答您的问题。请稍后再试。' }]);
    } finally {
      console.log('聊天页面 - 消息处理完成，重置加载状态');
      setIsLoading(false);
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
          <div className="text-red-500 mb-4">您需要登录才能访问此页面</div>
          <button 
            className="btn-primary" 
            onClick={() => window.location.href = '/login?redirect=/chat'}
          >
            去登录
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* 顶部导航栏 */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <div className="content-container py-8">
            <h1 className="text-3xl font-bold">AI对话</h1>
            <p className="mt-2 text-blue-100">基于HR数据回答您的问题，提供智能化的人力资源分析</p>
          </div>
        </div>
        
        {/* 主体内容区 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧边栏 */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hidden md:block">
            <div className="p-3">
              <div className="flex flex-col space-y-1">
                <div className="px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium text-left">
                  AI对话
                </div>
                <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs">
                  基于HR数据的智能问答
                </div>
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-3">
                    示例问题
                  </div>
                  <div className="space-y-1">
                    {[
                      '公司有多少员工？',
                      '各部门的人数分布如何？',
                      '员工的平均年龄是多少？',
                      '男女比例是多少？'
                    ].map((question, index) => (
                      <button
                        key={index}
                        className="w-full px-3 py-1.5 text-left text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        onClick={() => handleExampleClick(question)}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 左侧边栏底部状态指示器 */}
                <div className="mt-auto pt-4 px-3">
                  {apiHealthy === true && (
                    <div className="flex items-center text-xs text-green-500">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      API服务正常
                    </div>
                  )}
                  {apiHealthy === false && (
                    <div className="flex items-center text-xs text-red-500">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      API服务异常
                    </div>
                  )}
                  {apiHealthy === null && (
                    <div className="flex items-center text-xs text-gray-400">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                      正在检查API状态
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 主聊天区域 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 欢迎信息 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-3xl mx-auto">
                {messages.length === 1 && (
                  <div className="text-center my-12">
                    <h2 className="text-3xl font-medium text-gray-800 dark:text-white mb-6">
                      <span className="text-green-500">Good</span> <span className="text-green-500">afternoon</span>, 
                      <span className="text-gray-400 ml-2">{user?.email?.split('@')[0] || localUser?.email?.split('@')[0] || '用户'}</span>!
                    </h2>
                  </div>
                )}
                
                {/* 消息列表 */}
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <div 
                      key={index} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="h-8 w-8 rounded-full bg-blue-600 flex-shrink-0 mr-3 flex items-center justify-center overflow-hidden mt-1">
                          <Image 
                            src="/images/animal_chara_radio_penguin.png" 
                            alt="HR助手" 
                            width={32} 
                            height={32}
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHptMC0xNGMtMi42NyAwLTUuMiAxLjUzLTYuMzIgNGgyLjY4Yy44NC0xLjE5IDIuMjEtMiAzLjY0LTIgMS4xMSAwIDIuMTIuNDEgMi45MSAxLjA5bDEuNDEtMS40MUMxNC44OCA2LjY0IDEzLjUxIDYgMTIgNnptNi4zMiA0SDEzLjY4QzEyLjg0IDguODEgMTEuNDcgOCAxMCA4Yy0xLjExIDAtMi4xMi40MS0yLjkxIDEuMDlMNS42OCA3LjY4QzYuODggNi42NCA4LjI1IDYgOS43NiA2YzIuNjcgMCA1LjIgMS41MyA2LjMyIDR6Ii8+PC9zdmc+';
                            }}
                          />
                        </div>
                      )}
                      <div 
                        className={`max-w-[85%] md:max-w-[75%] ${
                          message.role === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
                        } rounded-lg px-4 py-3 shadow-sm`}
                      >
                        {message.content}
                      </div>
                      {message.role === 'user' && (
                        <div className="h-8 w-8 rounded-full bg-gray-300 flex-shrink-0 ml-3 flex items-center justify-center overflow-hidden mt-1">
                          <Image 
                            src={getAvatarByAgeAndGender(
                              getUserMetadata(user || localUser).age,
                              getUserMetadata(user || localUser).gender
                            )} 
                            alt="用户" 
                            width={32} 
                            height={32}
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzljOWM5YyI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgM2MyLjY3IDAgOCAyIDggMnMtNS4zMyA1LjMzLTggNS4zM1M0IDcgNCA3czUuMzMtMiA4LTJ6bTAgMTJjLTIuNjcgMC01LjMzLS42Ny01LjMzLS42N3YtMi42N2MwLTIuNjcgMi42Ny00IDUuMzMtNCAyLjY3IDAgNS4zMyAxLjMzIDUuMzMgNHYyLjY3cy0yLjY3LjY3LTUuMzMuNjd6Ii8+PC9zdmc+';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex-shrink-0 mr-3 flex items-center justify-center overflow-hidden mt-1">
                        <Image 
                          src="/images/animal_chara_radio_penguin.png" 
                          alt="HR助手" 
                          width={32} 
                          height={32}
                          className="object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHptMC0xNGMtMi42NyAwLTUuMiAxLjUzLTYuMzIgNGgyLjY4Yy44NC0xLjE5IDIuMjEtMiAzLjY0LTIgMS4xMSAwIDIuMTIuNDEgMi45MSAxLjA5bDEuNDEtMS40MUMxNC44OCA2LjY0IDEzLjUxIDYgMTIgNnptNi4zMiA0SDEzLjY4QzEyLjg0IDguODEgMTEuNDcgOCAxMCA4Yy0xLjExIDAtMi4xMi40MS0yLjkxIDEuMDlMNS42OCA3LjY4QzYuODggNi42NCA4LjI1IDYgOS43NiA2YzIuNjcgMCA1LjIgMS41MyA2LjMyIDR6Ii8+PC9zdmc+';
                          }}
                        />
                      </div>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 shadow-sm max-w-[85%] md:max-w-[75%]">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 如果没有消息或只有初始消息，显示示例问题 */}
                {showExamples && messages.length <= 1 && (
                  <div className="mt-8 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                      {[
                        '公司有多少员工？',
                        '各部门的人数分布如何？',
                        '员工的平均年龄是多少？',
                        '男女比例是多少？'
                      ].map((question, index) => (
                        <button
                          key={index}
                          className="text-left p-3 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200 border border-gray-200 dark:border-gray-700 shadow-sm"
                          onClick={() => handleExampleClick(question)}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 底部输入区域 */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  <div className="flex items-end">
                    <div className="relative flex-grow">
                      <textarea
                        className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none transition-all duration-200"
                        placeholder="请输入您的问题..."
                        rows={1}
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value);
                          // 自动调整高度
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        style={{ minHeight: '44px', maxHeight: '120px' }}
                      />
                      <div className="absolute right-3 bottom-3 flex space-x-1 text-gray-400">
                        <button className="p-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <button
                      className={`ml-3 h-11 w-11 rounded-lg flex items-center justify-center transition-all duration-200 ${
                        isLoading || !input.trim() 
                          ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                          : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white'
                      }`}
                      onClick={handleSendMessage}
                      disabled={isLoading || !input.trim()}
                    >
                      {isLoading ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="mt-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <div>请输入您的问题，按Enter发送</div>
                    <div className="flex space-x-2">
                      <button className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 