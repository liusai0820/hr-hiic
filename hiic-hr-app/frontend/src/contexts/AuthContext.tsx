'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { User, Session, AuthError } from '@supabase/supabase-js';

// 定义认证上下文类型
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isApproved: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<any>;
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
  const [isApproved, setIsApproved] = useState(false);
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
        console.log('AuthContext - 未找到有效会话，尝试从localStorage恢复');
        
        // 尝试从localStorage恢复会话
        try {
          const storedSession = localStorage.getItem('hiic-hr-auth');
          if (storedSession) {
            const sessionData = JSON.parse(storedSession);
            if (sessionData.user) {
              console.log('AuthContext - 从localStorage恢复用户会话');
              setUser(sessionData.user);
              
              // 尝试刷新会话
              refreshSession().catch(e => {
                console.error('AuthContext - 刷新会话失败:', e);
              });
              
              return; // 成功从localStorage恢复，提前返回
            }
          }
        } catch (e) {
          console.error('AuthContext - 从localStorage恢复会话失败:', e);
        }
        
        // 如果无法从localStorage恢复，则设置用户为null
        console.log('AuthContext - 无法从localStorage恢复会话，设置用户为null');
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
      
      // 尝试从localStorage恢复会话
      try {
        const storedSession = localStorage.getItem('hiic-hr-auth');
        if (storedSession) {
          const sessionData = JSON.parse(storedSession);
          if (sessionData.user) {
            console.log('AuthContext - 从localStorage恢复用户会话（错误恢复）');
            setUser(sessionData.user);
            return; // 成功从localStorage恢复，提前返回
          }
        }
      } catch (e) {
        console.error('AuthContext - 从localStorage恢复会话失败:', e);
      }
      
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

  // 检查用户审批状态
  const checkApprovalStatus = async (user: User) => {
    if (!user?.user_metadata) return false;
    return user.user_metadata.approved === true;
  };

  // 检查用户是否已完善个人信息
  const hasCompletedProfile = (user: User | null) => {
    if (!user?.user_metadata) return false;
    
    // 如果是第一次登录的用户，默认允许访问
    if (user.email === 'liusai64@gmail.com') {
      console.log('AuthContext - 特殊用户账号，允许访问聊天页面');
      return true; 
    }
    
    const { 姓名, 性别, 年龄, 部门 } = user.user_metadata;
    return Boolean(姓名 && 性别 && 年龄 && 部门);
  };

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
        throw new Error(signInError.message || '登录失败，请检查您的邮箱和密码');
      }

      if (!data?.user) {
        console.error('AuthContext - 登录后未返回用户信息');
        throw new Error('登录失败，未能获取用户信息');
      }

      // 检查用户是否已被审批
      const isUserApproved = await checkApprovalStatus(data.user);
      if (!isUserApproved) {
        throw new Error('您的账号正在等待管理员审批，请稍后再试');
      }

      setIsApproved(true);
      console.log('AuthContext - 登录成功:', data.user.email);
      
      // 立即设置用户状态
      setUser(data.user);
      
      // 检查是否已完善个人信息
      const profileCompleted = hasCompletedProfile(data.user);
      if (!profileCompleted) {
        console.log('AuthContext - 用户未完善个人信息，重定向到设置页面');
        router.push('/profile/setup');
        return data;
      }

      // 如果是管理员且已完善信息，重定向到管理页面
      if (data.user.user_metadata?.role === 'admin') {
        router.push('/admin/users');
      } else {
        router.push('/chat');
      }
      
      // 强制保存会话到localStorage和cookie
      if (data.session) {
        try {
          // 创建一个类型安全的会话对象
          const sessionData = {
            user: {
              id: data.user?.id || '',
              email: data.user?.email,
              user_metadata: data.user?.user_metadata || {}
            },
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token || '',
            expires_at: data.session.expires_at || Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30
          };
          
          const sessionStr = JSON.stringify(sessionData);
          
          // 保存到localStorage
          localStorage.setItem('hiic-hr-auth', sessionStr);
          localStorage.setItem('supabase.auth.token', sessionStr);
          console.log('AuthContext - 已保存会话到localStorage');
          
          // 设置cookie，有效期30天
          const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          document.cookie = `hiic-hr-auth=${encodeURIComponent(sessionStr)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
          document.cookie = `sb-access-token=${data.session.access_token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
          document.cookie = `sb-refresh-token=${data.session.refresh_token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
          document.cookie = `supabase.auth.token=${encodeURIComponent(sessionStr)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
          console.log('AuthContext - 已保存会话到cookie');
          
          // 验证cookie是否设置成功
          console.log('AuthContext - 当前cookies:', document.cookie);
          
          // 设置全局变量
          if (typeof window !== 'undefined') {
            window.hiicHrSession = sessionData;
            window.hiicHrAuthInitialized = true;
          }
        } catch (storageErr) {
          console.error('AuthContext - 保存会话失败:', storageErr);
        }
      }
      
      return data;
    } catch (error: any) {
      console.error('AuthContext - 登录过程中出错:', error);
      setError(error.message || '登录失败，请稍后重试');
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 注册函数
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
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