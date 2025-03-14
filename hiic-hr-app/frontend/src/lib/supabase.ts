// 在文件顶部添加全局类型声明
declare global {
  interface Window {
    hiicHrExplicitSignOut?: boolean;
    hiicHrSession?: any; // 用于存储会话信息
    hiicHrAuthInitialized?: boolean; // 标记认证是否已初始化
  }
}

import { createClient } from '@supabase/supabase-js';

// 获取环境变量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 创建一个简化的会话对象，避免循环引用
function createSimplifiedSession(session: any) {
  if (!session) return null;
  
  try {
    // 创建一个新对象，只包含必要的字段
    const simplifiedSession = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      user: session.user ? {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        user_metadata: session.user.user_metadata,
        app_metadata: session.user.app_metadata,
        aud: session.user.aud,
        created_at: session.user.created_at
      } : null
    };
    
    return simplifiedSession;
  } catch (e) {
    console.error('创建简化会话对象失败:', e);
    return session; // 如果处理失败，返回原始会话
  }
}

// 保存会话到localStorage和cookie
function saveSessionToStorage(session: any) {
  if (!session) return;
  
  try {
    // 创建简化的会话对象
    const simplifiedSession = createSimplifiedSession(session);
    const sessionStr = JSON.stringify(simplifiedSession);
    
    // 保存到localStorage
    localStorage.setItem('hiic-hr-auth', sessionStr);
    localStorage.setItem('supabase.auth.token', sessionStr);
    
    // 保存到cookie，30天过期
    document.cookie = `hiic-hr-auth=${encodeURIComponent(sessionStr)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    
    // 保存到全局变量
    if (typeof window !== 'undefined') {
      window.hiicHrSession = simplifiedSession;
    }
    
    console.log('会话已保存到存储');
  } catch (e) {
    console.error('保存会话到存储失败:', e);
  }
}

// 从存储中恢复会话
function restoreSessionFromStorage() {
  try {
    // 首先检查localStorage
    const authData = localStorage.getItem('hiic-hr-auth');
    if (authData) {
      try {
        const session = JSON.parse(authData);
        console.log('从localStorage恢复会话成功');
        return session;
      } catch (e) {
        console.error('解析localStorage中的会话失败:', e);
      }
    }
    
    // 然后检查cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'hiic-hr-auth' && value) {
        try {
          const session = JSON.parse(decodeURIComponent(value));
          console.log('从cookie恢复会话成功');
          return session;
        } catch (e) {
          console.error('解析cookie中的会话失败:', e);
        }
      }
    }
    
    return null;
  } catch (e) {
    console.error('恢复会话失败:', e);
    return null;
  }
}

// 创建Supabase客户端
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: false, // 禁用自动刷新令牌
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: 'supabase.auth.token',
    },
  }
);

// 监听认证状态变化
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`认证状态变化: ${event}`, session ? '有会话' : '无会话');
    
    if (event === 'SIGNED_IN' && session) {
      console.log('用户已登录，保存会话');
      saveSessionToStorage(session);
    } else if (event === 'SIGNED_OUT') {
      // 只有在明确登出时才清除会话
      if (window.hiicHrExplicitSignOut) {
        console.log('用户明确登出，清除会话');
        localStorage.removeItem('hiic-hr-auth');
        localStorage.removeItem('supabase.auth.token');
        document.cookie = 'hiic-hr-auth=; path=/; max-age=0';
        if (typeof window !== 'undefined') {
          window.hiicHrSession = undefined;
        }
      } else {
        console.log('检测到自动登出事件，但未明确登出，尝试恢复会话');
        const storedSession = restoreSessionFromStorage();
        if (storedSession && storedSession.access_token) {
          console.log('从存储恢复会话');
          
          // 尝试重新设置会话
          supabase.auth.setSession({
            access_token: storedSession.access_token,
            refresh_token: storedSession.refresh_token || ''
          }).then(({ data, error }) => {
            if (error) {
              console.error('重新设置会话失败:', error);
            } else if (data.session) {
              console.log('会话重新设置成功');
            }
          }).catch(e => {
            console.error('重新设置会话时出错:', e);
          });
        }
      }
    } else if (event === 'TOKEN_REFRESHED' && session) {
      console.log('令牌已刷新，更新存储的会话');
      saveSessionToStorage(session);
    }
  });
  
  // 初始化时尝试恢复会话
  const storedSession = restoreSessionFromStorage();
  if (storedSession && storedSession.access_token) {
    console.log('初始化时从存储恢复会话');
    
    // 设置全局会话变量
    window.hiicHrSession = storedSession;
    
    // 尝试设置Supabase会话
    supabase.auth.setSession({
      access_token: storedSession.access_token,
      refresh_token: storedSession.refresh_token || ''
    }).then(({ data, error }) => {
      if (error) {
        console.error('初始化时设置会话失败:', error);
      } else if (data.session) {
        console.log('初始化时设置会话成功');
      }
    }).catch(e => {
      console.error('初始化时设置会话时出错:', e);
    });
  }
}

// 创建Auth类
export class Auth {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  // 使用邮箱和密码登录
  async signInWithEmail(email: string, password: string) {
    try {
      console.log('Auth - 尝试使用邮箱登录:', email);
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Auth - 登录失败:', error.message);
        throw error;
      }

      console.log('Auth - 登录成功:', data.user?.email);
      
      // 手动保存会话到全局变量
      if (typeof window !== 'undefined' && data.session) {
        window.hiicHrSession = {
          user: {
            id: data.user?.id,
            email: data.user?.email,
            user_metadata: data.user?.user_metadata
          },
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        };
        console.log('Auth - 已保存会话到全局变量');
      }
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Auth - 登录过程中出错:', error.message);
      return { data: null, error };
    }
  }

  // 使用邮箱和密码注册
  async signUpWithEmail(email: string, password: string) {
    try {
      console.log('Auth - 尝试注册新用户:', email);
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Auth - 注册失败:', error.message);
        throw error;
      }

      console.log('Auth - 注册成功，等待验证:', email);
      return { data, error: null };
    } catch (error: any) {
      console.error('Auth - 注册过程中出错:', error.message);
      return { data: null, error };
    }
  }

  // 退出登录
  async signOut() {
    try {
      console.log('Auth - 尝试退出登录');
      
      // 设置明确登出标志
      if (typeof window !== 'undefined') {
        window.hiicHrExplicitSignOut = true;
      }
      
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        console.error('Auth - 退出登录失败:', error.message);
        throw error;
      }

      console.log('Auth - 退出登录成功');
      
      // 手动清除会话
      if (typeof window !== 'undefined') {
        window.hiicHrSession = null;
        localStorage.removeItem('hiic-hr-auth');
        localStorage.removeItem('supabase.auth.token');
        
        if (typeof document !== 'undefined') {
          document.cookie.split(';').forEach(cookie => {
            const [name] = cookie.trim().split('=');
            if (name && (name.includes('supabase') || name.includes('auth') || name.includes('hiic'))) {
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
          });
        }
        
        console.log('Auth - 已手动清除所有会话数据');
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Auth - 退出登录过程中出错:', error.message);
      return { error };
    }
  }

  // 重置密码
  async resetPassword(email: string) {
    try {
      console.log('Auth - 尝试发送密码重置邮件:', email);
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Auth - 发送密码重置邮件失败:', error.message);
        throw error;
      }

      console.log('Auth - 密码重置邮件已发送:', email);
      return { error: null };
    } catch (error: any) {
      console.error('Auth - 发送密码重置邮件过程中出错:', error.message);
      return { error };
    }
  }

  // 刷新会话
  async refreshSession() {
    try {
      console.log('Auth - 尝试刷新会话');
      
      // 如果有全局会话，优先使用它
      if (typeof window !== 'undefined' && window.hiicHrSession) {
        console.log('Auth - 从全局变量恢复会话');
        return {
          data: {
            session: window.hiicHrSession,
            user: window.hiicHrSession.user
          },
          error: null
        };
      }
      
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error) {
        console.error('Auth - 刷新会话失败:', error.message);
        
        // 尝试从localStorage恢复
        if (typeof window !== 'undefined') {
          const savedSession = localStorage.getItem('hiic-hr-auth');
          if (savedSession) {
            try {
              const sessionData = JSON.parse(savedSession);
              console.log('Auth - 从localStorage恢复会话');
              return {
                data: {
                  session: sessionData,
                  user: sessionData.user
                },
                error: null
              };
            } catch (e) {
              console.error('Auth - 解析localStorage会话失败:', e);
            }
          }
        }
        
        throw error;
      }

      console.log('Auth - 会话刷新成功');
      return { data, error: null };
    } catch (error: any) {
      console.error('Auth - 刷新会话过程中出错:', error.message);
      return { data: null, error };
    }
  }
  
  // 获取当前会话
  async getSession() {
    try {
      console.log('Auth - 获取当前会话');
      
      // 如果有全局会话，优先使用它
      if (typeof window !== 'undefined' && window.hiicHrSession) {
        console.log('Auth - 从全局变量获取会话');
        return {
          data: {
            session: window.hiicHrSession
          },
          error: null
        };
      }
      
      // 尝试从API获取
      const { data, error } = await this.supabase.auth.getSession();
      
      if (error || !data.session) {
        console.log('Auth - API获取会话失败或无会话');
        
        // 尝试从localStorage恢复
        if (typeof window !== 'undefined') {
          const savedSession = localStorage.getItem('hiic-hr-auth');
          if (savedSession) {
            try {
              const sessionData = JSON.parse(savedSession);
              console.log('Auth - 从localStorage获取会话');
              
              // 保存到全局变量
              window.hiicHrSession = sessionData;
              
              return {
                data: {
                  session: sessionData
                },
                error: null
              };
            } catch (e) {
              console.error('Auth - 解析localStorage会话失败:', e);
            }
          }
        }
        
        if (error) {
          console.error('Auth - 获取会话错误:', error);
          return { data: { session: null }, error };
        }
      }
      
      // 如果API返回了会话，保存到全局变量
      if (data.session && typeof window !== 'undefined') {
        window.hiicHrSession = {
          user: {
            id: data.session.user?.id,
            email: data.session.user?.email,
            user_metadata: data.session.user?.user_metadata
          },
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        };
        console.log('Auth - 已保存API会话到全局变量');
      }
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Auth - 获取会话过程中出错:', error.message);
      return { data: { session: null }, error };
    }
  }
}

// 创建认证实例
export const auth = new Auth(supabase);

// 初始化全局会话
if (typeof window !== 'undefined' && !window.hiicHrAuthInitialized) {
  try {
    // 尝试从localStorage加载会话
    const savedSession = localStorage.getItem('hiic-hr-auth');
    if (savedSession) {
      try {
        window.hiicHrSession = JSON.parse(savedSession);
        console.log('Supabase - 初始化时从localStorage加载会话到全局变量');
      } catch (e) {
        console.error('Supabase - 解析localStorage会话失败:', e);
      }
    }
    
    window.hiicHrAuthInitialized = true;
    console.log('Supabase - 认证系统初始化完成');
  } catch (e) {
    console.error('Supabase - 初始化认证系统失败:', e);
  }
}

// 认证相关函数
export const authFunctions = {
  // 创建管理员账号
  createAdminAccount: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          approved: true,  // 管理员默认已审批
          role: 'admin',   // 管理员角色
          registered_at: new Date().toISOString()
        }
      }
    });
    return { data, error };
  },

  // 检查用户审批状态
  checkApprovalStatus: async () => {
    // 直接返回已批准状态，移除审批流程
    return { approved: true, error: null };
  },
};

// 辅助函数：清除所有认证相关数据
function clearAllAuthData() {
  try {
    // 清除localStorage中的所有认证相关数据
    const authKeys = [
      'hiic-hr-auth',
      'supabase.auth.token',
      'supabase.auth.refreshToken',
      'supabase.auth.accessToken'
    ];
    
    authKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error(`清除localStorage key ${key} 失败:`, e);
      }
    });
    
    // 清除所有supabase相关的cookie
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name && (name.includes('supabase') || name.includes('auth'))) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        console.log(`Auth helper - 已清除cookie: ${name}`);
      }
    });
    
    console.log('Auth helper - 已清除所有认证相关数据');
  } catch (err) {
    console.error('Auth helper - 清除认证数据失败:', err);
  }
}

// 导出默认客户端
export default supabase; 