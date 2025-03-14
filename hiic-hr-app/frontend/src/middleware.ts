import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 定义受保护的路由
const protectedRoutes = ['/chat', '/profile', '/dashboard', '/admin'];
const loginRoute = '/login';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const path = url.pathname;
  
  console.log(`中间件处理请求: ${path}`);
  
  // 设置缓存控制头，防止缓存问题
  const response = NextResponse.next({
    headers: {
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
    },
  });
  
  try {
    // 获取所有认证相关的cookie
    const supabaseCookie = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;
    const manualSessionCookie = request.cookies.get('hiic-hr-auth')?.value;
    
    console.log(`中间件 - 认证Cookie状态: 
      sb-access-token: ${supabaseCookie ? '存在' : '不存在'}
      sb-refresh-token: ${refreshToken ? '存在' : '不存在'}
      hiic-hr-auth: ${manualSessionCookie ? '存在' : '不存在'}`
    );
    
    // 尝试解析手动存储的会话
    let manualSession = null;
    if (manualSessionCookie) {
      try {
        manualSession = JSON.parse(decodeURIComponent(manualSessionCookie));
        console.log(`中间件 - 从cookie解析到手动会话: 用户ID=${manualSession.user?.id || '未知'}`);
      } catch (e) {
        console.error('中间件 - 解析手动会话失败:', e);
      }
    }
    
    // 如果没有API会话但有手动会话，设置相应的cookie
    if (!supabaseCookie && manualSession && manualSession.access_token) {
      console.log('中间件 - 使用手动会话设置API cookie');
      
      // 设置访问令牌cookie
      response.cookies.set({
        name: 'sb-access-token',
        value: manualSession.access_token,
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30天
        sameSite: 'lax',
      });
      
      // 设置刷新令牌cookie
      if (manualSession.refresh_token) {
        response.cookies.set({
          name: 'sb-refresh-token',
          value: manualSession.refresh_token,
          path: '/',
          maxAge: 60 * 60 * 24 * 30, // 30天
          sameSite: 'lax',
        });
      }
    }
    
    // 检查会话是否有效
    const hasValidSession = supabaseCookie || (manualSession && manualSession.access_token);
    
    // 检查会话是否即将过期
    if (manualSession && manualSession.expires_at) {
      const expiresAt = new Date(manualSession.expires_at).getTime();
      const now = Date.now();
      const timeLeft = expiresAt - now;
      
      if (timeLeft < 0) {
        console.warn(`中间件 - 会话已过期 ${Math.abs(timeLeft) / 1000} 秒`);
      } else if (timeLeft < 60 * 60 * 1000) { // 少于1小时
        console.warn(`中间件 - 会话即将在 ${timeLeft / 1000} 秒后过期`);
      } else {
        console.log(`中间件 - 会话有效，将在 ${timeLeft / (1000 * 60 * 60)} 小时后过期`);
      }
    }
    
    // 处理受保护的路由
    if (protectedRoutes.some(route => path.startsWith(route))) {
      console.log(`中间件 - 访问受保护路由: ${path}`);
      
      if (!hasValidSession) {
        console.log('中间件 - 未检测到有效会话，重定向到登录页');
        url.pathname = loginRoute;
        url.searchParams.set('redirect', path);
        return NextResponse.redirect(url);
      }
      
      console.log('中间件 - 会话有效，允许访问受保护路由');
      return response;
    }
    
    // 处理登录页面 - 如果已登录，重定向到首页
    if (path === loginRoute && hasValidSession) {
      console.log('中间件 - 用户已登录，从登录页重定向到首页');
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    
    return response;
  } catch (error) {
    console.error('中间件处理出错:', error);
    return response;
  }
}

// 配置中间件匹配的路由
export const config = {
  matcher: [
    /*
     * 匹配所有路径，但排除以下路径:
     * - 静态文件: _next/static, _next/image, favicon.ico
     * - 公共资源: public/
     * - API路由: /api/
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ]
}; 