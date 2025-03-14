import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isApproved, signOut } = useAuth();
  const router = useRouter();
  
  // 添加超时自动重置状态
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (isLoading) {
      timeoutId = setTimeout(() => {
        console.log('Navbar - 退出登录状态超时自动重置');
        setIsLoading(false);
      }, 8000); // 8秒后自动重置状态
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading]);

  // 处理登录/注销
  const handleAuthAction = async () => {
    if (user) {
      // 如果已经在加载中，不重复处理
      if (isLoading) return;
      
      try {
        setIsLoading(true);
        console.log('Navbar - 开始退出登录流程');
        
        // 设置明确登出标志
        if (typeof window !== 'undefined') {
          window.hiicHrExplicitSignOut = true;
        }
        
        // 创建一个超时计时器，确保即使退出登录过程卡住也能继续
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('退出登录超时'));
          }, 5000); // 5秒超时
        });
        
        try {
          // 使用Promise.race确保不会永久等待
          await Promise.race([
            signOut(),
            timeoutPromise
          ]);
          console.log('Navbar - 退出登录成功完成');
          
          // 强制刷新页面，确保状态完全重置
          window.location.href = '/login';
        } catch (timeoutErr) {
          console.error('Navbar - 退出登录超时或失败:', timeoutErr);
          
          // 手动清除所有认证相关数据
          try {
            localStorage.removeItem('hiic-hr-auth');
            localStorage.removeItem('supabase.auth.token');
            sessionStorage.removeItem('hiic-hr-auth');
            
            // 清除所有supabase相关的cookie
            document.cookie.split(';').forEach(cookie => {
              const [name] = cookie.trim().split('=');
              if (name && (name.includes('supabase') || name.includes('auth'))) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
              }
            });
            
            console.log('Navbar - 已手动清除所有认证相关数据');
          } catch (err) {
            console.error('Navbar - 清除认证数据失败:', err);
          }
          
          // 超时后强制刷新页面
          window.location.href = '/login';
        }
      } catch (err) {
        console.error('Navbar - 退出登录出错:', err);
        // 出错时也强制刷新页面
        window.location.href = '/login';
      } finally {
        setIsLoading(false);
      }
    } else {
      router.push('/login');
    }
  };

  // 判断是否为管理员
  const isAdmin = user?.user_metadata?.role === 'admin';

  // 处理导航链接点击
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    console.log(`Navbar - 处理导航链接点击: ${path}`);
    
    if (!user) {
      console.log('Navbar - 用户未登录，重定向到登录页');
      window.location.href = `/login?redirect=${encodeURIComponent(path)}`;
    } else {
      console.log(`Navbar - 用户已登录，导航到: ${path}`);
      
      // 确保会话信息正确传递
      try {
        // 检查localStorage中是否有会话信息
        const storedSession = localStorage.getItem('hiic-hr-auth');
        console.log('Navbar - 检查localStorage中的会话信息:', storedSession ? '存在' : '不存在');
        
        // 无论是否存在，都重新保存会话信息
        const sessionData = {
          user: user,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('hiic-hr-auth', JSON.stringify(sessionData));
        console.log('Navbar - 已更新localStorage中的会话信息');
        
        // 设置cookie，确保服务器端也能识别会话
        const sessionStr = JSON.stringify(sessionData);
        document.cookie = `hiic-hr-auth=${encodeURIComponent(sessionStr)}; path=/; max-age=86400; SameSite=Lax`;
        console.log('Navbar - 已设置hiic-hr-auth cookie');
        
        // 检查cookie是否设置成功
        console.log('Navbar - 当前cookies:', document.cookie);
      } catch (err) {
        console.error('Navbar - 保存会话信息失败:', err);
      }
      
      // 添加一个小延迟，确保cookie和localStorage更新完成
      console.log(`Navbar - 准备导航到: ${path}`);
      setTimeout(() => {
        // 使用window.location.href确保完全刷新页面，避免客户端路由问题
        window.location.href = path;
      }, 100);
    }
  };

  return (
    <nav className="bg-[var(--card)] fixed w-full z-20 top-0 left-0 border-b border-[var(--border)] h-[var(--header-height)] shadow-sm">
      <div className="w-full h-full flex items-center justify-between px-4 md:px-8 lg:px-12">
        <Link href="/" className="flex items-center">
          <span className="self-center text-2xl font-semibold whitespace-nowrap">HIIC HR</span>
        </Link>
        
        <div className="flex items-center">
          {/* 桌面导航 */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="nav-link">首页</Link>
            {user && (
              <>
                <a 
                  href="/chat" 
                  className="nav-link" 
                  onClick={(e) => handleNavClick(e, '/chat')}
                >
                  AI对话
                </a>
                <a 
                  href="/visualizations" 
                  className="nav-link"
                  onClick={(e) => handleNavClick(e, '/visualizations')}
                >
                  数据可视化
                </a>
                <a 
                  href="/employees" 
                  className="nav-link"
                  onClick={(e) => handleNavClick(e, '/employees')}
                >
                  员工数据
                </a>
              </>
            )}
          </div>
          
          <button 
            className={`${user ? 'bg-red-500 hover:bg-red-600' : 'btn-primary'} ml-6 px-4 py-2 rounded-md text-white font-medium transition-colors ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
            onClick={handleAuthAction}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                处理中
              </span>
            ) : user ? '注销' : '登录'}
          </button>
          
          {/* 移动端菜单按钮 */}
          <button 
            className="ml-4 md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 smooth-transition"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="sr-only">打开主菜单</span>
            <svg className="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      
      {/* 移动端菜单 */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-[var(--header-height)] left-0 w-full bg-[var(--card)] border-b border-[var(--border)] shadow-md">
          <div className="px-4 py-3 space-y-1">
            <Link 
              href="/" 
              className="block py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 smooth-transition"
              onClick={() => setIsMenuOpen(false)}
            >
              首页
            </Link>
            {user && (
              <>
                <a 
                  href="/chat" 
                  className="block py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 smooth-transition"
                  onClick={(e) => {
                    setIsMenuOpen(false);
                    handleNavClick(e, '/chat');
                  }}
                >
                  AI对话
                </a>
                <a 
                  href="/visualizations" 
                  className="block py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 smooth-transition"
                  onClick={(e) => {
                    setIsMenuOpen(false);
                    handleNavClick(e, '/visualizations');
                  }}
                >
                  数据可视化
                </a>
                <a 
                  href="/employees" 
                  className="block py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 smooth-transition"
                  onClick={(e) => {
                    setIsMenuOpen(false);
                    handleNavClick(e, '/employees');
                  }}
                >
                  员工数据
                </a>
              </>
            )}
            
            <button 
              className={`w-full text-left py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 smooth-transition ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
              onClick={() => {
                setIsMenuOpen(false);
                handleAuthAction();
              }}
              disabled={isLoading}
            >
              {isLoading ? '处理中...' : (user ? '注销' : '登录')}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
} 