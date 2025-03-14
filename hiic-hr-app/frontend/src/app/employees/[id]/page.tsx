'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import { employeeApi } from '@/services/api';

interface Employee {
  id: number;
  姓名: string;
  性别: string;
  部门: string;
  职位: string;
  学历: string;
  年龄: number;
  [key: string]: string | number | null | undefined;
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const id = Number(params.id);
        if (isNaN(id)) {
          throw new Error('无效的员工ID');
        }
        const data = await employeeApi.getEmployeeById(id);
        setEmployee(data);
        setError(null);
      } catch (err) {
        console.error('获取员工数据失败:', err);
        setError('获取员工数据失败，请稍后再试');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [params.id]);

  // 员工信息字段分组
  const personalInfo = [
    { label: '姓名', key: '姓名' },
    { label: '性别', key: '性别' },
    { label: '年龄', key: '年龄' },
    { label: '出生日期', key: '出生日期' },
  ];

  const workInfo = [
    { label: '部门', key: '部门' },
    { label: '职位', key: '职位' },
    { label: '入职日期', key: '入职日期' },
    { label: '工作年限', key: '工作年限' },
  ];

  const educationInfo = [
    { label: '学历', key: '学历' },
    { label: '毕业院校', key: '毕业院校' },
    { label: '专业', key: '专业' },
    { label: '毕业日期', key: '毕业日期' },
  ];

  // 获取员工的晋升记录和获奖情况
  const careerInfo = [
    { label: '工作变动', key: '工作变动' },
    { label: '晋升记录', key: '晋升记录' },
    { label: '获奖情况', key: '获奖情况' },
  ];

  // 根据性别选择头像背景色
  const getAvatarColor = () => {
    if (!employee) return 'bg-gray-300';
    return employee.性别 === '女' ? 'bg-purple-500' : 'bg-blue-500';
  };

  // 处理职业发展信息中的特殊字符
  const formatCareerInfo = (text: string | number | null | undefined): string[] => {
    if (text === null || text === undefined) return [];
    
    // 将文本转换为字符串
    const str = String(text);
    
    // 首先尝试解析JSON格式
    try {
      // 检查是否是JSON数组格式
      if ((str.startsWith('[') && str.endsWith(']')) || (str.includes('\\['))) {
        // 尝试清理并解析JSON
        const cleanedStr = str
          .replace(/\\\\/g, '\\')
          .replace(/\\"/g, '"')
          .replace(/"\[/g, '[')
          .replace(/\]"/g, ']');
          
        try {
          const parsed = JSON.parse(cleanedStr);
          if (Array.isArray(parsed)) {
            return parsed.map(item => String(item).trim()).filter(Boolean);
          }
        } catch (e) {
          // JSON解析失败，继续尝试其他方法
          console.log('JSON解析失败，尝试其他方法');
        }
      }
    } catch (e) {
      // 如果解析失败，继续使用其他方法
      console.log('JSON格式检测失败');
    }
    
    // 如果不是JSON格式，尝试按照特定模式提取信息
    
    // 1. 清除多余的特殊字符，但保留关键信息
    let cleaned = str
      .replace(/\\+/g, '') // 移除反斜杠
      .replace(/\[+/g, '') // 移除左方括号
      .replace(/\]+/g, '') // 移除右方括号
      .replace(/\"+/g, '') // 移除引号
      .trim();
    
    // 2. 尝试按照年份分割文本
    const yearPattern = /\b(20\d{2})\b/g; // 匹配2000-2099年的年份
    const years = [...cleaned.matchAll(yearPattern)].map(m => m[0]);
    
    if (years.length > 0) {
      // 使用年份作为分隔点
      let segments: string[] = [];
      let lastIndex = 0;
      
      // 查找所有年份位置并分割
      [...cleaned.matchAll(yearPattern)].forEach(match => {
        const year = match[0];
        const index = match.index as number;
        
        // 如果年份前面有内容，且不是上一个分段的结尾，添加到结果中
        if (index > lastIndex && index - lastIndex > 1) {
          const prevContent = cleaned.substring(lastIndex, index).trim();
          if (prevContent && !prevContent.endsWith(':') && !prevContent.endsWith('：')) {
            segments.push(prevContent);
          }
        }
        
        // 查找这个年份后面的内容，直到下一个年份或结尾
        const nextYearMatch = [...cleaned.matchAll(yearPattern)].find(m => (m.index as number) > index);
        const endIndex = nextYearMatch ? nextYearMatch.index : cleaned.length;
        
        const content = cleaned.substring(index, endIndex).trim();
        if (content) {
          segments.push(content);
        }
        
        lastIndex = endIndex;
      });
      
      // 如果有剩余内容，添加到结果中
      if (lastIndex < cleaned.length) {
        const remainingContent = cleaned.substring(lastIndex).trim();
        if (remainingContent) {
          segments.push(remainingContent);
        }
      }
      
      // 过滤空字符串并返回
      return segments.filter(Boolean);
    }
    
    // 3. 如果没有找到年份，尝试按照中文顿号、分号或句号分割
    if (cleaned.includes('、') || cleaned.includes('；') || cleaned.includes('。')) {
      return cleaned
        .split(/[、；。]/)
        .map(item => item.trim())
        .filter(Boolean);
    }
    
    // 4. 如果以上方法都不适用，返回整个清理后的字符串
    return [cleaned].filter(Boolean);
  };

  // 格式化职业发展信息的显示
  const formatCareerDisplay = (text: string | number | null | undefined): React.ReactNode => {
    if (text === null || text === undefined) return <span className="text-gray-400 dark:text-gray-500">暂无记录</span>;
    
    const formattedItems = formatCareerInfo(text);
    
    if (formattedItems.length === 0) return <span className="text-gray-400 dark:text-gray-500">暂无记录</span>;
    
    // 如果只有一项，直接显示
    if (formattedItems.length === 1) return <div>{formattedItems[0]}</div>;
    
    // 如果有多项，使用时间线样式显示
    return (
      <div className="space-y-3">
        {formattedItems.map((item, index) => {
          // 尝试提取年份
          const yearMatch = item.match(/\b(20\d{2})\b/);
          const year = yearMatch ? yearMatch[0] : null;
          
          // 如果有年份，将其作为标题，其余作为内容
          let title = '';
          let content = item;
          
          if (year) {
            // 如果年份在开头，将其作为标题
            if (item.startsWith(year)) {
              // 清理年份后面的逗号和空格
              const yearEndIndex = year.length;
              let contentStartIndex = yearEndIndex;
              
              // 跳过年份后面的逗号、空格等分隔符
              while (contentStartIndex < item.length && 
                    [',', '，', ':', '：', ' ', '\t'].includes(item[contentStartIndex])) {
                contentStartIndex++;
              }
              
              title = year;
              content = item.substring(contentStartIndex).trim();
            } else {
              // 如果年份不在开头，尝试提取完整的标题部分
              const parts = item.split(/[:：]/);
              if (parts.length > 1) {
                title = parts[0].trim();
                content = parts.slice(1).join(':').trim();
              }
            }
          } else {
            // 如果没有年份，检查是否有其他分隔符
            const parts = item.split(/[:：]/);
            if (parts.length > 1) {
              title = parts[0].trim();
              content = parts.slice(1).join(':').trim();
            }
          }
          
          // 如果内容为空，使用整个项目作为内容
          if (!content && title) {
            content = title;
            title = '';
          }
          
          // 清理内容中的前导逗号和空格
          if (content) {
            content = content.replace(/^[,，\s]+/, '').trim();
          }
          
          return (
            <div key={index} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1"></div>
                {index < formattedItems.length - 1 && <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700"></div>}
              </div>
              <div className="flex-1">
                {title ? (
                  <>
                    <div className="font-medium text-blue-600 dark:text-blue-400">{title}</div>
                    {content && <div>{content}</div>}
                  </>
                ) : (
                  <div>{content}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 格式化日期显示
  const formatDate = (dateStr: string | number | null | undefined): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(String(dateStr));
      if (isNaN(date.getTime())) return String(dateStr);
      return date.toLocaleDateString('zh-CN');
    } catch (e) {
      return String(dateStr);
    }
  };

  return (
    <PageLayout>
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col">
        {/* 页面标题 */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <div className="content-container py-8">
            <h1 className="text-3xl font-bold">员工详情</h1>
            <p className="mt-2 text-purple-100">查看员工的详细信息</p>
          </div>
        </div>
        
        <div className="content-container flex-grow">
          {/* 返回按钮 */}
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回列表
          </button>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : error ? (
            <div className="modern-card p-4 bg-red-50 dark:bg-red-900/20 text-center text-red-500">{error}</div>
          ) : employee ? (
            <div className="space-y-8">
              {/* 员工基本信息卡片 */}
              <div className="modern-card p-8">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className={`w-24 h-24 ${getAvatarColor()} rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-md`}>
                      {employee.姓名?.charAt(0) || '?'}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div className="flex flex-col md:flex-row md:items-end justify-between">
                      <div>
                        <h1 className="text-3xl font-bold mb-1">{employee.姓名}</h1>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {employee.职位}
                          </span>
                          <span className="text-gray-400 dark:text-gray-500">•</span>
                          <span>{employee.部门}</span>
                          <span className="text-gray-400 dark:text-gray-500">•</span>
                          <span>ID: {employee.id}</span>
                        </div>
                      </div>
                      <div className="mt-4 md:mt-0">
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          在职 {employee.工作年限} 年
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 详细信息卡片 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 左侧：个人和工作信息 */}
                <div className="space-y-6">
                  {/* 个人信息 */}
                  <div className="modern-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--border)] bg-gray-50 dark:bg-gray-800/80">
                      <h2 className="text-lg font-semibold">个人信息</h2>
                    </div>
                    <div className="p-6">
                      <dl className="grid grid-cols-1 gap-4">
                        {personalInfo.map((item) => (
                          <div key={item.key} className="flex justify-between items-center py-2 border-b border-[var(--border)] last:border-0">
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.label}</dt>
                            <dd className="text-sm font-semibold">
                              {item.key === '出生日期' 
                                ? formatDate(employee[item.key]) 
                                : employee[item.key] !== undefined ? String(employee[item.key]) : '-'}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>

                  {/* 工作信息 */}
                  <div className="modern-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--border)] bg-gray-50 dark:bg-gray-800/80">
                      <h2 className="text-lg font-semibold">工作信息</h2>
                    </div>
                    <div className="p-6">
                      <dl className="grid grid-cols-1 gap-4">
                        {workInfo.map((item) => (
                          <div key={item.key} className="flex justify-between items-center py-2 border-b border-[var(--border)] last:border-0">
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.label}</dt>
                            <dd className="text-sm font-semibold">
                              {item.key === '入职日期' 
                                ? formatDate(employee[item.key]) 
                                : employee[item.key] !== undefined ? String(employee[item.key]) : '-'}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                </div>

                {/* 右侧：教育和职业发展信息 */}
                <div className="space-y-6">
                  {/* 教育信息 */}
                  <div className="modern-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--border)] bg-gray-50 dark:bg-gray-800/80">
                      <h2 className="text-lg font-semibold">教育信息</h2>
                    </div>
                    <div className="p-6">
                      <dl className="grid grid-cols-1 gap-4">
                        {educationInfo.map((item) => (
                          <div key={item.key} className="flex justify-between items-center py-2 border-b border-[var(--border)] last:border-0">
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.label}</dt>
                            <dd className="text-sm font-semibold">
                              {item.key === '毕业日期' 
                                ? formatDate(employee[item.key]) 
                                : employee[item.key] !== undefined ? String(employee[item.key]) : '-'}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>

                  {/* 职业发展 */}
                  <div className="modern-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--border)] bg-gray-50 dark:bg-gray-800/80">
                      <h2 className="text-lg font-semibold">职业发展</h2>
                    </div>
                    <div className="p-6">
                      <dl className="grid grid-cols-1 gap-6">
                        {careerInfo.map((item) => (
                          <div key={item.key} className="space-y-2">
                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.label}</dt>
                            <dd className="text-sm bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                              {formatCareerDisplay(employee[item.key])}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="modern-card p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium mb-2">未找到员工数据</h3>
              <p className="text-gray-500 dark:text-gray-400">无法找到该员工的相关信息，请检查员工ID是否正确。</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}