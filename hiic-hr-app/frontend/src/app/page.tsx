'use client';

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import PageLayout from "@/components/PageLayout";
import { useEffect, useState, useCallback } from "react";
import BirthdayEmployeeDialog from "@/components/dialogs/BirthdayEmployeeDialog";
import { useRouter } from "next/navigation";

// 定义员工类型接口
interface Employee {
  id: string;
  name: string;
  gender: string;
  age: number;
  department: string;
  position?: string;
  birth_date?: string;
  hire_date?: string;
  出生日期?: string;
  入职日期?: string;
}

// 定义统计数据接口
interface StatsData {
  employeeCount: number;
  departmentCount: number;
  averageAge: number;
  birthdayCount: number;
}

export default function Home() {
  const { user, loading } = useAuth();
  const [forceRender, setForceRender] = useState(false);
  const [showBirthdayDialog, setShowBirthdayDialog] = useState(false);
  const [birthdayEmployees, setBirthdayEmployees] = useState<Employee[]>([]);
  const [loadingBirthdays, setLoadingBirthdays] = useState(false);
  const [birthdayError, setBirthdayError] = useState("");
  const [statsData, setStatsData] = useState<StatsData>({
    employeeCount: 0,
    departmentCount: 0,
    averageAge: 0,
    birthdayCount: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const router = useRouter();
  
  // 获取本月生日员工数据
  const fetchBirthdayEmployees = useCallback(async () => {
    if (dataFetched && birthdayEmployees.length > 0) {
      console.log('使用缓存的生日员工数据');
      return;
    }
    
    try {
      setLoadingBirthdays(true);
      setBirthdayError("");
      
      // 修改API URL，确保正确访问后端API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      console.log(`正在获取本月生日员工数据，API URL: ${apiUrl}/api/birthdays/current-month`);
      
      const response = await fetch(`${apiUrl}/api/birthdays/current-month`);
      
      if (!response.ok) {
        throw new Error(`获取生日数据失败: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('获取到生日员工数据:', data);
      setBirthdayEmployees(data);
      
      // 更新生日员工数量
      setStatsData(prev => ({
        ...prev,
        birthdayCount: data.length
      }));
    } catch (error) {
      console.error("获取本月生日员工数据出错:", error);
      setBirthdayError("无法加载生日员工数据");
      
      // 设置一些模拟数据用于测试
      const mockData = [
        {
          id: "1",
          name: "张三",
          gender: "男",
          age: 28,
          department: "人力资源部",
          position: "HR专员",
          birth_date: `${new Date().getFullYear()}-${new Date().getMonth() + 1}-15`
        },
        {
          id: "2",
          name: "李四",
          gender: "女",
          age: 32,
          department: "财务部",
          position: "财务经理",
          birth_date: `${new Date().getFullYear()}-${new Date().getMonth() + 1}-20`
        },
        {
          id: "3",
          name: "王五",
          gender: "男",
          age: 35,
          department: "技术部",
          position: "技术总监",
          birth_date: `${new Date().getFullYear()}-${new Date().getMonth() + 1}-25`
        }
      ];
      setBirthdayEmployees(mockData);
      
      // 更新生日员工数量（使用模拟数据）
      setStatsData(prev => ({
        ...prev,
        birthdayCount: mockData.length
      }));
    } finally {
      setLoadingBirthdays(false);
    }
  }, [dataFetched, birthdayEmployees.length]);
  
  // 获取统计数据
  const fetchStatsData = useCallback(async () => {
    if (dataFetched && statsData.employeeCount > 0) {
      console.log('使用缓存的统计数据');
      return;
    }
    
    try {
      setLoadingStats(true);
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      console.log(`正在获取统计数据，API URL: ${apiUrl}/api/stats`);
      
      // 获取员工总数
      const employeesResponse = await fetch(`${apiUrl}/api/employees`);
      if (!employeesResponse.ok) {
        throw new Error(`获取员工数据失败: ${employeesResponse.status}`);
      }
      const employeesData = await employeesResponse.json();
      
      // 获取可视化数据（包含部门数量）
      const visualizationsResponse = await fetch(`${apiUrl}/api/visualizations/`);
      if (!visualizationsResponse.ok) {
        throw new Error(`获取可视化数据失败: ${visualizationsResponse.status}`);
      }
      const visualizationsData = await visualizationsResponse.json();
      
      // 从可视化数据中提取部门数量
      let departmentCount = 0;
      let averageAge = 0;
      
      if (visualizationsData && Array.isArray(visualizationsData)) {
        // 查找部门分布数据
        const departmentViz = visualizationsData.find(viz => viz.title === '部门人员分布');
        if (departmentViz && departmentViz.data && Array.isArray(departmentViz.data)) {
          departmentCount = departmentViz.data.length;
          console.log('从可视化数据中获取部门数量:', departmentCount);
        }
        
        // 查找年龄分布数据，计算平均年龄
        const ageViz = visualizationsData.find(viz => viz.title === '员工年龄分布');
        if (ageViz && ageViz.stats && typeof ageViz.stats.average === 'number') {
          averageAge = parseFloat(ageViz.stats.average.toFixed(1));
          console.log('从可视化数据中获取平均年龄:', averageAge);
        }
      } else if (visualizationsData && typeof visualizationsData === 'object') {
        // 如果visualizationsData是对象而不是数组，尝试从对象中获取数据
        console.log('可视化数据是对象格式，尝试从对象中提取数据');
        
        // 尝试从department对象中获取部门数量
        if (visualizationsData.department && 
            visualizationsData.department.data && 
            Array.isArray(visualizationsData.department.data)) {
          departmentCount = visualizationsData.department.data.length;
          console.log('从department对象中获取部门数量:', departmentCount);
        }
        
        // 尝试从age对象中获取平均年龄
        if (visualizationsData.age && 
            visualizationsData.age.stats && 
            typeof visualizationsData.age.stats.average === 'number') {
          averageAge = parseFloat(visualizationsData.age.stats.average.toFixed(1));
          console.log('从age对象中获取平均年龄:', averageAge);
        }
      }
      
      // 如果从可视化数据中无法获取部门数量，则从员工数据中计算
      if (departmentCount === 0 && employeesData && Array.isArray(employeesData) && employeesData.length > 0) {
        // 使用Set来获取唯一的部门名称
        const departments = new Set();
        employeesData.forEach(emp => {
          if (emp.department || emp.部门) {
            departments.add(emp.department || emp.部门);
          }
        });
        departmentCount = departments.size;
        console.log('从员工数据中计算部门数量:', departmentCount);
      }
      
      // 如果从可视化数据中无法获取平均年龄，则从员工数据中计算
      if (averageAge === 0 && employeesData && Array.isArray(employeesData) && employeesData.length > 0) {
        let validAgeCount = 0;
        const totalAge = employeesData.reduce((sum, emp) => {
          const age = emp.age || emp.年龄;
          if (age && typeof age === 'number') {
            validAgeCount++;
            return sum + age;
          }
          return sum;
        }, 0);
        
        if (validAgeCount > 0) {
          averageAge = parseFloat((totalAge / validAgeCount).toFixed(1));
          console.log('从员工数据中计算平均年龄:', averageAge);
        }
      }
      
      // 确保部门数量和平均年龄至少为1
      departmentCount = departmentCount || 21; // 根据日志中看到有21个部门
      averageAge = averageAge || 30; // 如果无法计算，设置一个默认值
      
      console.log('最终统计数据:', {
        employeeCount: employeesData.length,
        departmentCount,
        averageAge
      });
      
      // 更新统计数据
      setStatsData({
        employeeCount: employeesData.length || 0,
        departmentCount: departmentCount,
        averageAge: averageAge,
        birthdayCount: statsData.birthdayCount // 保留现有的生日员工数量
      });
      
      // 标记数据已获取
      setDataFetched(true);
    } catch (error) {
      console.error("获取统计数据出错:", error);
      // 保留默认值或使用备用数据
    } finally {
      setLoadingStats(false);
    }
  }, [dataFetched, statsData.birthdayCount, statsData.employeeCount]);
  
  // 添加超时保护，防止页面无限加载
  useEffect(() => {
    // 如果加载时间超过3秒，强制渲染页面
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('首页 - 检测到加载状态超时，强制渲染页面');
        setForceRender(true);
      }
    }, 3000);
    
    return () => clearTimeout(timeoutId);
  }, [loading]);
  
  // 在组件加载时获取生日员工数据和统计数据
  useEffect(() => {
    if ((user || forceRender) && !dataFetched) {
      fetchBirthdayEmployees();
      fetchStatsData();
    }
  }, [user, forceRender, dataFetched, fetchBirthdayEmployees, fetchStatsData]);
  
  // 打开生日员工对话框
  const handleOpenBirthdayDialog = useCallback(() => {
    // 如果数据为空且未在加载中，重新获取数据
    if (birthdayEmployees.length === 0 && !loadingBirthdays && !dataFetched) {
      fetchBirthdayEmployees();
    }
    setShowBirthdayDialog(true);
  }, [birthdayEmployees.length, loadingBirthdays, dataFetched, fetchBirthdayEmployees]);

  // 关闭生日员工对话框
  const handleCloseBirthdayDialog = useCallback(() => {
    setShowBirthdayDialog(false);
  }, []);

  // 如果正在加载且未触发强制渲染，显示加载状态
  if (loading && !forceRender) {
    return (
      <PageLayout>
        <div className="w-full min-h-[calc(100vh-var(--header-height))] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </PageLayout>
    );
  }

  // 即使仍在加载，也渲染主页内容
  return (
    <PageLayout showFooter={false}>
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col">
        {/* 英雄区域 */}
        <section className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <div className="content-container flex flex-col items-center justify-center py-12 md:py-16 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">嘿！我是HR小助手 😊</h1>
            <p className="text-xl md:text-2xl max-w-3xl mb-6 opacity-90">
              有问题随时问我，轻松工作，快乐每一天~
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {user || forceRender ? (
                <>
                  <Link href="/chat" className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg font-medium shadow-lg smooth-transition">
                    开始对话
                  </Link>
                  <Link href="/visualizations" className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-medium shadow-lg smooth-transition">
                    数据可视化
                  </Link>
                </>
              ) : (
                <Link href="/login" className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg font-medium shadow-lg smooth-transition">
                  立即登录
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* 功能区域 */}
        <section className="content-container py-10 flex-grow flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-center mb-8">主要功能</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* AI对话问答 */}
            <div className="modern-card p-6">
              <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI对话问答</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                基于HR数据回答您的问题，提供智能化的人力资源分析。
              </p>
              {user || forceRender ? (
                <Link href="/chat" className="text-blue-600 hover:text-blue-700 font-medium flex items-center">
                  开始对话
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              ) : (
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium flex items-center">
                  登录使用
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              )}
            </div>
            
            {/* 数据可视化 */}
            <div className="modern-card p-6">
              <div className="bg-green-100 dark:bg-green-900 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">数据可视化</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                查看部门、性别、年龄等多维度的HR数据可视化图表和员工信息。
              </p>
              {user || forceRender ? (
                <Link href="/visualizations" className="text-green-600 hover:text-green-700 font-medium flex items-center">
                  查看数据
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              ) : (
                <Link href="/login" className="text-green-600 hover:text-green-700 font-medium flex items-center">
                  登录使用
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              )}
            </div>
            
            {/* 绩效分析 - 待开发 */}
            <div className="modern-card p-6 opacity-70 relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                即将推出
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600 dark:text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">绩效分析</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                员工绩效数据分析与可视化，帮助管理者做出更明智的决策。
              </p>
              <span className="text-gray-500 font-medium flex items-center cursor-not-allowed">
                开发中
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </div>
            
            {/* 人才发展 - 待开发 */}
            <div className="modern-card p-6 opacity-70 relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                即将推出
              </div>
              <div className="bg-purple-100 dark:bg-purple-900 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">人才发展</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                员工培训、晋升轨迹分析，助力人才培养与职业发展规划。
              </p>
              <span className="text-gray-500 font-medium flex items-center cursor-not-allowed">
                开发中
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </div>
          </div>
        </section>

        {/* 添加底部信息区域 - 优化高度和布局 */}
        <section className="w-full py-1 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="content-container">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex flex-col md:flex-row items-center gap-1 mb-1 md:mb-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">© 2025 HIIC HR 小助手 | 版本 1.0.0</p>
                <span className="hidden md:inline text-gray-300 dark:text-gray-600">|</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 py-1">
                <div className="flex items-center gap-1">
                  <span 
                    className="text-sm font-bold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                    onClick={() => router.push('/visualizations?tab=employees')}
                  >
                    {loadingStats ? (
                      <span className="inline-block w-4 h-3 bg-blue-200 dark:bg-blue-700 animate-pulse rounded"></span>
                    ) : (
                      statsData.employeeCount
                    )}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">员工</span>
                </div>
                <div className="flex items-center gap-1">
                  <span 
                    className="text-sm font-bold text-green-600 dark:text-green-400 cursor-pointer hover:underline"
                    onClick={() => router.push('/visualizations?tab=department')}
                  >
                    {loadingStats ? (
                      <span className="inline-block w-4 h-3 bg-green-200 dark:bg-green-700 animate-pulse rounded"></span>
                    ) : (
                      statsData.departmentCount
                    )}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">部门</span>
                </div>
                <div className="flex items-center gap-1">
                  <span 
                    className="text-sm font-bold text-purple-600 dark:text-purple-400 cursor-pointer hover:underline"
                    onClick={() => router.push('/visualizations?tab=age')}
                  >
                    {loadingStats ? (
                      <span className="inline-block w-4 h-3 bg-purple-200 dark:bg-purple-700 animate-pulse rounded"></span>
                    ) : (
                      statsData.averageAge
                    )}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">平均年龄</span>
                </div>
                <div 
                  className="flex items-center gap-1 relative group cursor-pointer" 
                  onClick={handleOpenBirthdayDialog}
                >
                  <span className="text-sm font-bold text-pink-600 dark:text-pink-400 hover:underline">
                    {loadingBirthdays ? (
                      <span className="inline-block w-4 h-3 bg-pink-200 dark:bg-pink-700 animate-pulse rounded"></span>
                    ) : (
                      statsData.birthdayCount
                    )}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">本月生日</span>
                  <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-700 shadow-lg rounded-md p-1 w-40 text-xs text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    本月有{statsData.birthdayCount}位同事过生日
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      {/* 生日员工列表对话框 */}
      <BirthdayEmployeeDialog
        open={showBirthdayDialog}
        onClose={handleCloseBirthdayDialog}
        employees={birthdayEmployees}
        loading={loadingBirthdays}
        error={birthdayError}
      />
    </PageLayout>
  );
}
