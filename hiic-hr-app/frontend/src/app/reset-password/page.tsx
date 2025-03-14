'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import PageLayout from '@/components/PageLayout';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { loading, error, resetPassword } = useAuth();

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      console.error('重置密码失败:', err);
    }
  };

  return (
    <PageLayout>
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col">
        {/* 页面标题 */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <div className="content-container py-8">
            <h1 className="text-3xl font-bold">重置密码</h1>
            <p className="mt-2 text-purple-100">
              输入您的邮箱地址，我们将发送重置密码的链接
            </p>
          </div>
        </div>

        {/* 重置密码表单 */}
        <div className="content-container flex-grow flex items-center justify-center py-12">
          <div className="w-full max-w-md">
            <div className="modern-card p-8">
              {/* 成功消息 */}
              {success ? (
                <div className="text-center">
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
                    重置密码链接已发送到您的邮箱，请查收并按照指示重置密码。
                  </div>
                  <Link
                    href="/login"
                    className="btn-primary inline-block px-6 py-2"
                  >
                    返回登录
                  </Link>
                </div>
              ) : (
                <>
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

                    {/* 提交按钮 */}
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
                        '发送重置链接'
                      )}
                    </button>

                    {/* 返回登录 */}
                    <div className="text-center mt-4">
                      <Link
                        href="/login"
                        className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                      >
                        返回登录页面
                      </Link>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 