'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PageLayout from '@/components/PageLayout';
import axios from 'axios';

// 用户类型定义
interface User {
  id: string;
  email: string;
  approved: boolean;
  role: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { user, isApproved } = useAuth();
  const router = useRouter();

  // 检查是否有管理员权限
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        if (!user) {
          console.log('未登录，重定向到登录页面');
          router.push('/login');
          return;
        }

        // 检查用户元数据中的角色
        const userRole = user.user_metadata?.role;
        console.log('当前用户角色:', userRole);

        if (userRole !== 'admin') {
          console.log('非管理员用户，重定向到首页');
          router.push('/');
          return;
        }

        // 检查是否已完善个人信息
        const { 姓名, 性别, 年龄, 部门 } = user.user_metadata || {};
        if (!姓名 || !性别 || !年龄 || !部门) {
          console.log('管理员未完善个人信息，重定向到设置页面');
          router.push('/profile/setup');
          return;
        }

        // 获取用户列表
        await fetchUsers();
      } catch (err) {
        console.error('检查管理员权限失败:', err);
        router.push('/');
      }
    };

    checkAdminAccess();
  }, [user, router]);

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // 添加时间戳防止缓存
      const timestamp = new Date().getTime();
      
      // 获取所有用户
      const allUsersResponse = await axios.get(`/api/users?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
      setUsers(allUsersResponse.data);

      // 获取待审批用户
      const pendingUsersResponse = await axios.get(`/api/users/pending?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
      setPendingUsers(pendingUsersResponse.data);
    } catch (err: any) {
      console.error('获取用户列表失败:', err);
      setError(err.response?.data?.detail || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理用户审批
  const handleApproval = async (userId: string, approved: boolean) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      // 发送审批请求
      const response = await axios.post(`/api/users/${userId}/approve`, {
        user_id: userId,
        approved
      });

      // 更新用户列表
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      
      // 更新所有用户列表中的审批状态
      setUsers(users.map(u => {
        if (u.id === userId) {
          return { ...u, approved };
        }
        return u;
      }));

      setSuccessMessage(response.data.message);
    } catch (err: any) {
      console.error('审批用户失败:', err);
      setError(err.response?.data?.detail || '审批用户失败');
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  return (
    <PageLayout>
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col">
        {/* 页面标题 */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <div className="content-container py-8">
            <h1 className="text-3xl font-bold">用户管理</h1>
            <p className="mt-2 text-blue-100">
              管理系统用户和审批新用户注册
            </p>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="content-container py-8">
          {/* 消息提示 */}
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

          {/* 待审批用户 */}
          <div className="modern-card p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">待审批用户</h2>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : pendingUsers.length === 0 ? (
              <p className="text-gray-500 py-4">当前没有待审批的用户</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        邮箱
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        注册时间
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{formatDate(user.created_at)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleApproval(user.id, true)}
                            className="text-green-600 hover:text-green-900 mr-4"
                            disabled={loading}
                          >
                            批准
                          </button>
                          <button
                            onClick={() => handleApproval(user.id, false)}
                            className="text-red-600 hover:text-red-900"
                            disabled={loading}
                          >
                            拒绝
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 所有用户 */}
          <div className="modern-card p-6">
            <h2 className="text-xl font-bold mb-4">所有用户</h2>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : users.length === 0 ? (
              <p className="text-gray-500 py-4">没有用户数据</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        邮箱
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        角色
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        注册时间
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.role}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.approved ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              已审批
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              待审批
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{formatDate(user.created_at)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 