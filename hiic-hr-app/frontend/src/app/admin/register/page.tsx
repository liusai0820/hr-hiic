'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import axios from 'axios';

export default function AdminRegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // 验证表单
    if (!email || !password || !confirmPassword) {
      setError('请填写所有必填字段');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少为6位');
      return;
    }

    try {
      setLoading(true);

      // 发送创建管理员请求
      const response = await axios.post('/api/admin/create', {
        email,
        password
      });

      setSuccessMessage('管理员账号创建成功！即将跳转到个人信息设置页面...');
      
      // 3秒后跳转到个人信息设置页面
      setTimeout(() => {
        router.push('/profile/setup');
      }, 3000);
    } catch (err: any) {
      console.error('创建管理员账号失败:', err);
      setError(err.response?.data?.error || '创建管理员账号失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col">
        {/* 页面标题 */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <div className="content-container py-8">
            <h1 className="text-3xl font-bold">创建管理员账号</h1>
            <p className="mt-2 text-purple-100">
              创建一个具有管理员权限的账号
            </p>
          </div>
        </div>

        {/* 表单区域 */}
        <div className="content-container py-8">
          <div className="max-w-md mx-auto">
            <div className="modern-card p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 邮箱 */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    邮箱 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-modern"
                    required
                  />
                </div>

                {/* 密码 */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">
                    密码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-modern"
                    required
                    minLength={6}
                  />
                </div>

                {/* 确认密码 */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                    确认密码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-modern"
                    required
                    minLength={6}
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
                      创建中...
                    </>
                  ) : (
                    '创建管理员账号'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 