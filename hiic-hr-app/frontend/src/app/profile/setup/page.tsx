'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PageLayout from '@/components/PageLayout';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  姓名: string;
  性别: '男' | '女';
  年龄: number;
  部门: string;
  职位?: string;
}

// 部门列表
const DEPARTMENTS = [
  "大数据平台与信息部",
  "城市轨道与城市发展研究所",
  "数字经济研究所",
  "生物经济研究所",
  "海洋经济研究所",
  "服务业与社会民生研究所",
  "重大科技基础设施部",
  "区域发展研究所",
  "能源经济与绿色发展研究所-节能环保与双碳组",
  "能源经济与绿色发展研究所-新能源与汽车组",
  "园区服务部",
  "新材料产业研究所",
  "科技转化部",
  "经济运行研究所",
  "改革创新研究所",
  "战略发展与项目管理部",
  "人力资源部",
  "综合协同部",
  "党委办公室/合规管理部",
  "财务部",
  "创新中心"
] as const;

// 职位列表（通用职位）
const COMMON_POSITIONS = [
  "研究员",
  "主管",
  "大数据管理岗",
  "项目管理岗",
  "副所长",
  "部长",
  "副部长",
  "信息化工程师",
  "所长",
  "项目经理岗"
];

// 职位列表（根据部门动态显示）
const POSITIONS: { [key: string]: string[] } = {
  // 研究所类部门
  "城市轨道与城市发展研究所": ["所长", "副所长", "研究员", "项目管理岗"],
  "数字经济研究所": ["所长", "副所长", "研究员", "项目管理岗"],
  "生物经济研究所": ["所长", "副所长", "研究员", "项目管理岗"],
  "海洋经济研究所": ["所长", "副所长", "研究员", "项目管理岗"],
  "服务业与社会民生研究所": ["所长", "副所长", "研究员", "项目管理岗"],
  "区域发展研究所": ["所长", "副所长", "研究员", "项目管理岗"],
  "新材料产业研究所": ["所长", "副所长", "研究员", "项目管理岗"],
  "经济运行研究所": ["所长", "副所长", "研究员", "项目管理岗"],
  "改革创新研究所": ["所长", "副所长", "研究员", "项目管理岗"],

  // 能源经济与绿色发展研究所下属组
  "能源经济与绿色发展研究所-节能环保与双碳组": ["研究员", "主管", "项目管理岗"],
  "能源经济与绿色发展研究所-新能源与汽车组": ["研究员", "主管", "项目管理岗"],

  // 职能部门
  "大数据平台与信息部": ["部长", "副部长", "大数据管理岗", "信息化工程师", "主管"],
  "重大科技基础设施部": ["部长", "副部长", "主管", "项目管理岗"],
  "园区服务部": ["部长", "副部长", "主管"],
  "科技转化部": ["部长", "副部长", "主管", "项目经理岗"],
  "战略发展与项目管理部": ["部长", "副部长", "主管", "项目管理岗"],
  "人力资源部": ["部长", "副部长", "主管"],
  "综合协同部": ["部长", "副部长", "主管"],
  "党委办公室/合规管理部": ["部长", "副部长", "主管"],
  "财务部": ["部长", "副部长", "主管"],
  "创新中心": ["主管", "项目经理岗"]
};

export default function ProfileSetupPage() {
  const { user, loading, refreshSession } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({
    姓名: '',
    性别: '男',
    年龄: 25,
    部门: '',
    职位: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [availablePositions, setAvailablePositions] = useState<string[]>([]);
  const [sessionChecked, setSessionChecked] = useState(false);

  // 当部门改变时更新可选职位
  useEffect(() => {
    if (profile.部门) {
      setAvailablePositions(POSITIONS[profile.部门] || []);
      // 如果当前选择的职位不在新部门的职位列表中，清空职位选择
      if (!POSITIONS[profile.部门]?.includes(profile.职位 || '')) {
        setProfile(prev => ({ ...prev, 职位: '' }));
      }
    } else {
      setAvailablePositions([]);
    }
  }, [profile.部门]);

  // 检查用户是否已登录并处理会话问题
  useEffect(() => {
    let isActive = true;
    let sessionCheckTimeout: NodeJS.Timeout;

    const checkSession = async () => {
      if (!loading && !sessionChecked) {
        try {
          // 检查本地存储中的会话信息
          const authData = localStorage.getItem('hiic-hr-auth');
          if (!authData || !user) {
            if (isActive) {
              // 清除所有本地存储的认证信息
              localStorage.removeItem('hiic-hr-auth');
              localStorage.removeItem('supabase.auth.token');
              sessionStorage.removeItem('hiic-hr-auth');
              
              // 清除相关cookie
              document.cookie = 'hiic-hr-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              
              // 重定向到登录页面
              router.push('/login?redirect=/profile/setup&error=session_expired');
            }
            return;
          }

          // 只在初次加载时尝试刷新会话
          if (!sessionChecked) {
            await refreshSession();
            if (isActive) {
              setSessionChecked(true);
            }
          }
        } catch (e) {
          console.error('会话检查失败:', e);
          if (isActive) {
            // 设置5秒后重试
            sessionCheckTimeout = setTimeout(() => {
              setSessionChecked(false);
            }, 5000);
          }
        }
      }
    };

    checkSession();

    return () => {
      isActive = false;
      if (sessionCheckTimeout) {
        clearTimeout(sessionCheckTimeout);
      }
    };
  }, [loading, user, router, refreshSession, sessionChecked]);

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      setIsSubmitting(true);

      // 验证表单
      if (!profile.姓名 || !profile.性别 || !profile.年龄 || !profile.部门) {
        throw new Error('请填写所有必填字段');
      }

      if (profile.年龄 < 18 || profile.年龄 > 100) {
        throw new Error('请输入有效的年龄（18-100岁）');
      }

      // 更新用户元数据
      const { error: updateError } = await supabase.auth.updateUser({
        data: profile
      });

      if (updateError) {
        if (updateError.message.includes('JWT') || updateError.message.includes('token')) {
          throw new Error('登录已过期，请重新登录');
        }
        throw updateError;
      }

      setSuccessMessage('个人信息已更新');
      
      // 更新本地存储
      try {
        const authData = localStorage.getItem('hiic-hr-auth');
        if (authData) {
          const data = JSON.parse(authData);
          data.user = {
            ...data.user,
            user_metadata: {
              ...data.user.user_metadata,
              ...profile
            }
          };
          localStorage.setItem('hiic-hr-auth', JSON.stringify(data));
        }
      } catch (e) {
        console.error('更新本地存储失败:', e);
      }

      // 延迟跳转
      setTimeout(() => {
        router.push('/chat');
      }, 1500);
    } catch (err: any) {
      console.error('更新个人信息失败:', err);
      const errorMessage = err.message || '更新个人信息失败，请稍后重试';
      
      if (errorMessage.includes('登录已过期') || errorMessage.includes('会话已过期')) {
        // 清除认证信息并重定向到登录页面
        localStorage.removeItem('hiic-hr-auth');
        localStorage.removeItem('supabase.auth.token');
        router.push('/login?redirect=/profile/setup&error=session_expired');
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: name === '年龄' ? parseInt(value) || 0 : value
    }));
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="w-full min-h-[calc(100vh-var(--header-height))] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col">
        {/* 页面标题 */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <div className="content-container py-8">
            <h1 className="text-3xl font-bold">完善个人信息</h1>
            <p className="mt-2 text-purple-100">
              请填写您的基本信息，以便我们为您提供更好的服务
            </p>
          </div>
        </div>

        {/* 表单区域 */}
        <div className="content-container py-8">
          <div className="max-w-2xl mx-auto">
            <div className="modern-card p-8">
              {/* 错误消息 */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
                  {error}
                </div>
              )}

              {/* 成功消息 */}
              {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 姓名 */}
                <div>
                  <label htmlFor="姓名" className="block text-sm font-medium mb-1">
                    姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="姓名"
                    name="姓名"
                    value={profile.姓名}
                    onChange={handleInputChange}
                    className="input-modern"
                    required
                  />
                </div>

                {/* 性别 */}
                <div>
                  <label htmlFor="性别" className="block text-sm font-medium mb-1">
                    性别 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="性别"
                    name="性别"
                    value={profile.性别}
                    onChange={handleInputChange}
                    className="input-modern"
                    required
                  >
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>

                {/* 年龄 */}
                <div>
                  <label htmlFor="年龄" className="block text-sm font-medium mb-1">
                    年龄 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="年龄"
                    name="年龄"
                    value={profile.年龄}
                    onChange={handleInputChange}
                    className="input-modern"
                    min="18"
                    max="100"
                    required
                  />
                </div>

                {/* 部门 */}
                <div>
                  <label htmlFor="部门" className="block text-sm font-medium mb-1">
                    部门 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="部门"
                    name="部门"
                    value={profile.部门}
                    onChange={handleInputChange}
                    className="input-modern"
                    required
                  >
                    <option value="">请选择部门</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* 职位 */}
                <div>
                  <label htmlFor="职位" className="block text-sm font-medium mb-1">
                    职位
                  </label>
                  <select
                    id="职位"
                    name="职位"
                    value={profile.职位}
                    onChange={handleInputChange}
                    className="input-modern"
                    disabled={!profile.部门}
                  >
                    <option value="">请选择职位</option>
                    {availablePositions.map((position) => (
                      <option key={position} value={position}>{position}</option>
                    ))}
                  </select>
                </div>

                {/* 提交按钮 */}
                <button
                  type="submit"
                  className="btn-primary w-full py-2 flex justify-center items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      保存中...
                    </>
                  ) : (
                    '保存个人信息'
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