'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import PageLayout from '@/components/PageLayout';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp } = useAuth();

  // 检查是否已注册
  useEffect(() => {
    const registered = searchParams.get('registered');
    const pending = searchParams.get('pending');
    
    if (registered === 'true') {
      if (pending === 'true') {
        setSuccessMessage('注册成功！您的账号正在等待管理员审批，审批通过后即可登录。');
      } else {
        setSuccessMessage('注册成功！请登录您的账号。');
      }
    }
  }, [searchParams]);

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setError(null);

    try {
      setLoading(true);
      if (isLogin) {
        console.log('Login page - 尝试登录:', email);
        
        // 添加超时处理，确保登录过程不会无限挂起
        const loginPromise = signIn(email, password);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('登录请求超时，请稍后重试'));
          }, 10000); // 10秒超时
        });
        
        try {
          await Promise.race([loginPromise, timeoutPromise]);
          console.log('Login page - 登录成功');
          
          // 登录成功后手动重定向
          const redirect = searchParams.get('redirect') || '/';
          console.log(`Login page - 手动重定向到: ${redirect}`);
          
          // 使用直接的页面跳转，避免路由问题
          window.location.replace(redirect);
        } catch (timeoutErr) {
          console.error('Login page - 登录超时:', timeoutErr);
          throw timeoutErr;
        }
      } else {
        console.log('Login page - 尝试注册:', email);
        await signUp(email, password);
        console.log('Login page - 注册成功');
        setSuccessMessage('注册成功！您的账号正在等待管理员审批，审批通过后即可登录。');
        setIsLogin(true); // 切换回登录模式
      }
    } catch (err: any) {
      console.error('Login page - 认证失败:', err);
      setError(err.message || '认证失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 切换登录/注册模式
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setSuccessMessage('');
    setError(null);
  };

  return (
    <PageLayout>
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col">
        {/* 页面标题 */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <div className="content-container py-8">
            <h1 className="text-3xl font-bold">{isLogin ? '登录' : '注册'}</h1>
            <p className="mt-2 text-purple-100">
              {isLogin ? '登录您的账号以访问HIIC HR系统' : '创建一个新账号以访问HIIC HR系统'}
            </p>
          </div>
        </div>

        {/* 登录表单 */}
        <div className="content-container flex-grow flex items-center justify-center py-12">
          <div className="w-full max-w-md">
            <div className="modern-card p-8">
              {/* 成功消息 */}
              {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
                  {successMessage}
                </div>
              )}

              {/* 错误消息 */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 邮箱输入框 */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    邮箱地址
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-modern"
                    placeholder="请输入您的邮箱"
                    required
                  />
                </div>

                {/* 密码输入框 */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">
                    密码
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-modern pr-10"
                      placeholder="请输入您的密码"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* 登录/注册按钮 */}
                <button
                  type="submit"
                  className="btn-primary w-full py-2 flex justify-center items-center"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      处理中...
                    </>
                  ) : (
                    isLogin ? '登录' : '注册'
                  )}
                </button>

                {/* 切换登录/注册 */}
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                  >
                    {isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
                  </button>
                </div>

                {/* 忘记密码链接 */}
                {isLogin && (
                  <div className="text-center mt-2">
                    <Link
                      href="/reset-password"
                      className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                    >
                      忘记密码？
                    </Link>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 