import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "HIIC HR AI应用",
  description: "基于Supabase HR数据的AI对话和数据可视化应用",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            // 紧急修复 - 检测并解决无限加载状态
            (function() {
              // 如果页面加载超过5秒仍处于加载状态，尝试强制刷新
              const LOADING_TIMEOUT = 5000; // 5秒
              
              // 检查是否有加载状态指示器
              setTimeout(function() {
                const loadingIndicators = document.querySelectorAll('.animate-spin');
                if (loadingIndicators.length > 0) {
                  console.log('检测到页面可能处于无限加载状态，尝试恢复...');
                  
                  // 尝试重置加载状态
                  try {
                    // 检查是否在登录页面
                    if (window.location.pathname === '/login') {
                      console.log('在登录页面检测到无限加载，尝试重置状态');
                      // 强制刷新页面
                      window.location.reload();
                    } else {
                      // 检查是否已登录
                      const authData = localStorage.getItem('hiic-hr-auth');
                      if (authData) {
                        console.log('检测到用户已登录但页面仍在加载，尝试重定向');
                        // 如果已登录但页面仍在加载，尝试重定向到首页
                        window.location.replace('/');
                      } else {
                        console.log('未检测到登录信息，重定向到登录页');
                        window.location.replace('/login');
                      }
                    }
                  } catch (e) {
                    console.error('恢复加载状态时出错:', e);
                    // 出错时强制刷新
                    window.location.reload();
                  }
                }
              }, LOADING_TIMEOUT);
            })();
            
            // 禁用控制台错误，防止扩展错误干扰应用
            const originalConsoleError = console.error;
            console.error = function(...args) {
              // 过滤掉Chrome扩展相关的错误
              if (args[0] && typeof args[0] === 'string' && 
                  (args[0].includes('chrome-extension') || 
                   args[0].includes('net::ERR_FILE_NOT_FOUND'))) {
                return; // 忽略扩展相关错误
              }
              originalConsoleError.apply(console, args);
            };
            
            // 全局错误处理
            window.addEventListener('error', function(event) {
              // 阻止扩展资源加载错误冒泡
              if (event.target && 
                  (event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK') &&
                  (event.target.src && event.target.src.includes('chrome-extension') ||
                   event.target.href && event.target.href.includes('chrome-extension'))) {
                event.preventDefault();
                event.stopPropagation();
                return false;
              }
            }, true);
            
            // 确保localStorage可用
            try {
              localStorage.setItem('test', 'test');
              localStorage.removeItem('test');
              console.log('localStorage 可用');
              
              // 调试当前存储的认证信息
              const authKeys = [
                'hiic-hr-auth',
                'supabase.auth.token'
              ];
              
              authKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) {
                  try {
                    const parsed = JSON.parse(value);
                    console.log('存储的认证信息 ' + key + ':', {
                      user_id: parsed.user?.id || '未知',
                      email: parsed.user?.email || '未知',
                      expires_at: parsed.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : '未知'
                    });
                  } catch (e) {
                    console.log('存储的认证信息 ' + key + ':', value.substring(0, 50) + '...');
                  }
                } else {
                  console.log('未找到存储的认证信息:', key);
                }
              });
              
              // 检查当前页面路径
              console.log('当前页面路径:', window.location.pathname);
              console.log('当前页面查询参数:', window.location.search);
              
            } catch (e) {
              console.error('localStorage 不可用:', e);
            }
          `
        }} />
      </head>
      <body className={GeistSans.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
