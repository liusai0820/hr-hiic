'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { auth, supabase } from '@/lib/supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';

// 定义认证上下文类型
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isApproved: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

// 创建认证上下文
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  // 刷新会话函数
  const refreshSession = async () => {
    try {
      console.log('AuthContext - 尝试刷新会话');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('AuthContext - 刷新会话失败:', error);
        throw error;
      }
      
      if (data.session) {
        console.log('AuthContext - 会话刷新成功:', data.session.user.email);
        setUser(data.session.user);
      } else {
        console.log('AuthContext - 刷新会话后无会话');
        setUser(null);
      }
    } catch (err) {
      console.error('AuthContext - 刷新会话时出错:', err);
    }
  };

  // 添加超时保护，防止初始化过程卡住
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading && !initialized) {
        console.log('AuthContext - 检测到初始化超时，强制完成初始化');
        setLoading(false);
        setInitialized(true);
        
        // 尝试从localStorage获取会话信息
        try {
          const storedSession = localStorage.getItem('hiic-hr-auth');
          if (storedSession) {
            const sessionData = JSON.parse(storedSession);
            if (sessionData.user) {
              console.log('AuthContext - 从localStorage恢复用户会话');
              setUser(sessionData.user);
            }
          }
        } catch (e) {
          console.error('AuthContext - 从localStorage恢复会话失败:', e);
        }
      }
    }, 5000); // 5秒超时

    return () => clearTimeout(timeoutId);
  }, [loading, initialized]);

  // 检查用户会话
  const checkUser = async () => {
    try {
      console.log('AuthContext - 开始检查用户会话');
      setLoading(true);
      
      // 首先尝试从Supabase获取会话
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('AuthContext - 获取会话出错:', sessionError.message);
        throw sessionError;
      }
      
      if (session) {
        console.log('AuthContext - 找到有效会话，用户ID:', session.user.id);
        
        // 保存会话到localStorage
        try {
          localStorage.setItem('hiic-hr-auth', JSON.stringify({
            user: session.user,
            session: session,
            timestamp: new Date().toISOString()
          }));
          console.log('AuthContext - 会话已保存到localStorage');
        } catch (e) {
          console.error('AuthContext - 保存会话到localStorage失败:', e);
        }
        
        setUser(session.user);
      } else {
        console.log('AuthContext - 未找到有效会话');
        setUser(null);
        
        // 清除localStorage中的会话
        try {
          localStorage.removeItem('hiic-hr-auth');
        } catch (e) {
          console.error('AuthContext - 清除localStorage中的会话失败:', e);
        }
      }
    } catch (error: any) {
      console.error('AuthContext - 检查用户出错:', error.message);
      setError(error.message);
      setUser(null);
    } finally {
      setLoading(false);
      setInitialized(true);
      console.log('AuthContext - 用户会话检查完成');
    }
  };

  // 监听认证状态变化
  useEffect(() => {
    console.log('AuthContext - 设置认证状态监听器');
    
    // 初始检查
    checkUser();
    
    // 监听认证状态变化
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext - 认证状态变化:', event);
        
        if (event === 'SIGNED_IN' && session) {
          console.log('AuthContext - 用户已登录，用户ID:', session.user.id);
          setUser(session.user);
          
          // 保存会话到localStorage
          try {
            localStorage.setItem('hiic-hr-auth', JSON.stringify({
              user: session.user,
              session: session,
              timestamp: new Date().toISOString()
            }));
          } catch (e) {
            console.error('AuthContext - 保存会话到localStorage失败:', e);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthContext - 用户已登出');
          setUser(null);
          
          // 清除localStorage中的会话
          try {
            localStorage.removeItem('hiic-hr-auth');
          } catch (e) {
            console.error('AuthContext - 清除localStorage中的会话失败:', e);
          }
        }
      }
    );

    return () => {
      console.log('AuthContext - 清理认证状态监听器');
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 登录函数
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('AuthContext - 尝试登录:', email);
      
      // 直接使用 supabase 客户端进行登录
      const { error: signInError, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        console.error('AuthContext - 登录错误:', signInError);
        throw new Error(signInError.message);
      }

      if (!data?.user) {
        console.error('AuthContext - 登录后未返回用户信息');
        throw new Error('登录失败，未能获取用户信息');
      }

      console.log('AuthContext - 登录成功:', data.user.email);
      console.log('AuthContext - 会话信息:', JSON.stringify({
        user_id: data.user.id,
        email: data.user.email,
        session_expires: data.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : '未知'
      }));
      
      // 立即设置用户状态
      setUser(data.user);
      
      // 强制保存会话到localStorage
      if (data.session) {
        try {
          // 创建一个简化的会话对象，避免循环引用问题
          const sessionData = {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: {
              id: data.user.id,
              email: data.user.email,
              user_metadata: data.user.user_metadata
            },
            expires_at: data.session.expires_at || Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30
          };
          
          const sessionStr = JSON.stringify(sessionData);
          
          // 保存到localStorage
          localStorage.setItem('hiic-hr-auth', sessionStr);
          console.log('AuthContext - 已保存会话到localStorage');
          
          // 设置cookie，有效期30天
          const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          document.cookie = `hiic-hr-auth=${encodeURIComponent(sessionStr)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
          console.log('AuthContext - 已保存会话到cookie');
          
          // 验证cookie是否设置成功
          console.log('AuthContext - 当前cookies:', document.cookie);
          
          // 设置其他Supabase相关cookie
          document.cookie = `sb-access-token=${data.session.access_token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
          document.cookie = `sb-refresh-token=${data.session.refresh_token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
        } catch (storageErr) {
          console.error('AuthContext - 保存会话失败:', storageErr);
        }
      }
      
      // 检查是否有重定向参数
      const urlParams = new URLSearchParams(window.location.search);
      const redirectPath = urlParams.get('redirect');
      
      // 简化登录后的流程，直接重定向
      console.log('AuthContext - 登录成功，准备重定向');
      
      // 添加一个小延迟，确保会话状态更新完成
      setTimeout(() => {
        if (redirectPath) {
          console.log(`AuthContext - 重定向到: ${redirectPath}`);
          // 使用replace而不是href，避免历史记录问题
          window.location.replace(redirectPath);
        } else {
          console.log('AuthContext - 重定向到首页');
          window.location.replace('/');
        }
      }, 300);
      
    } catch (err: any) {
      console.error('AuthContext - 登录失败:', err);
      let errorMessage = '登录失败，请稍后重试';
      
      if (err.message?.includes('Invalid login credentials')) {
        errorMessage = '邮箱或密码错误';
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = '请先验证您的邮箱';
      } else if (err.message?.includes('rate limit')) {
        errorMessage = '尝试次数过多，请稍后再试';
      } else if (err.message?.includes('network')) {
        errorMessage = '网络连接错误，请检查您的网络';
      }
      
      setError(errorMessage);
      setLoading(false); // 确保在错误情况下重置加载状态
      throw new Error(errorMessage);
    }
  };

  // 注册函数
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { error: signUpError } = await auth.signUpWithEmail(email, password);
      
      if (signUpError) {
        throw new Error(signUpError.message);
      }
      
      router.push('/login?registered=true&pending=true');
    } catch (err: any) {
      console.error('注册失败:', err);
      let errorMessage = '注册失败，请稍后重试';
      
      // 处理常见错误
      if (err.message.includes('User already registered')) {
        errorMessage = '该邮箱已被注册';
      } else if (err.message.includes('Password should be')) {
        errorMessage = '密码不符合要求，请使用更复杂的密码';
      } else if (err.message.includes('Invalid email')) {
        errorMessage = '请输入有效的邮箱地址';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 登出函数
  const signOut = async () => {
    console.log('开始登出流程');
    
    try {
      // 设置明确登出标志
      if (typeof window !== 'undefined') {
        window.hiicHrExplicitSignOut = true;
        console.log('已设置明确登出标志');
      }
      
      // 清除本地存储
      localStorage.removeItem('hiic-hr-auth');
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.removeItem('hiic-hr-auth');
      
      // 清除cookie
      document.cookie = 'hiic-hr-auth=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'sb-refresh-token=; path=/; max-age=0; SameSite=Lax';
      
      console.log('已清除本地存储和cookie');
      
      // 调用Supabase登出
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase登出失败:', error);
      } else {
        console.log('Supabase登出成功');
      }
      
      // 清除全局会话变量
      if (typeof window !== 'undefined') {
        window.hiicHrSession = undefined;
        console.log('已清除全局会话变量');
      }
      
      // 设置用户状态为null
      setUser(null);
      console.log('已重置用户状态');
      
      // 延迟重定向，确保登出操作完成
      setTimeout(() => {
        console.log('登出完成，重定向到登录页');
        router.push('/login');
      }, 300);
    } catch (error) {
      console.error('登出过程中发生错误:', error);
      
      // 即使出错也尝试重定向
      setTimeout(() => {
        console.log('尽管出错，仍然重定向到登录页');
        router.push('/login');
      }, 500);
    }
  };

  // 重置密码函数
  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await auth.resetPassword(email);
      if (error) throw error;
    } catch (err: any) {
      console.error('重置密码失败:', err);
      setError(err.message || '重置密码失败');
    } finally {
      setLoading(false);
    }
  };

  // 登录
  const signInWithEmail = async (email: string, password: string) => {
    console.log('AuthContext - 开始登录流程，邮箱:', email);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('AuthContext - 登录失败:', error.message);
        setError(error.message);
        return { success: false, error: error.message };
      }

      console.log('AuthContext - 登录成功，用户ID:', data.user?.id);
      
      // 手动保存会话到localStorage
      try {
        localStorage.setItem('hiic-hr-auth', JSON.stringify({
          user: data.user,
          session: data.session,
          timestamp: new Date().toISOString()
        }));
        console.log('AuthContext - 会话已保存到localStorage');
        
        // 设置cookie以确保服务器端也能识别会话
        document.cookie = `sb-auth-token=${data.session?.access_token}; path=/; max-age=28800; SameSite=Lax`;
      } catch (e) {
        console.error('AuthContext - 保存会话到localStorage失败:', e);
      }

      return { success: true };
    } catch (error: any) {
      console.error('AuthContext - 登录过程中出错:', error.message);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // 提供上下文值
  const value = {
    user,
    loading,
    error,
    isApproved,
    initialized,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshSession,
    signInWithEmail
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 使用认证上下文的钩子
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 