'use client';

import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import { employeeApi, statsApi } from '@/services/api';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface Employee {
  id: string | number;
  name?: string;
  姓名: string;
  性别: string;
  部门: string;
  职位: string;
  学历?: string;
  年龄: number;
  [key: string]: string | number | null | undefined;
}

interface DepartmentStat {
  department: string;
  count: number;
}

// 创建一个全局缓存对象，用于存储员工数据和部门统计
const globalCache = {
  employees: [] as Employee[],
  departments: [] as DepartmentStat[],
  lastFetchTime: 0, // 上次获取数据的时间戳
  isFetching: false // 是否正在获取数据
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(globalCache.employees);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>(globalCache.employees);
  const [departments, setDepartments] = useState<DepartmentStat[]>(globalCache.departments);
  const [loading, setLoading] = useState(globalCache.employees.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 20;
  const router = useRouter();
  const pathname = usePathname();

  // 数据缓存有效期（毫秒），设置为5分钟
  const CACHE_DURATION = 5 * 60 * 1000;

  // 自定义样式
  const styles = {
    container: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '1.5rem',
      '@media (min-width: 1024px)': {
        gridTemplateColumns: '2fr 1fr',
      }
    },
    leftColumn: {
      width: '100%',
      '@media (min-width: 1024px)': {
        gridColumn: '1 / span 2',
      }
    },
    rightColumn: {
      width: '100%',
      '@media (min-width: 1024px)': {
        gridColumn: '3 / span 1',
      }
    },
    tableContainer: {
      overflowX: 'auto',
      width: '100%',
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      // 如果已经有数据且在缓存有效期内，直接使用缓存数据
      const now = Date.now();
      if (
        globalCache.employees.length > 0 && 
        now - globalCache.lastFetchTime < CACHE_DURATION &&
        !globalCache.isFetching
      ) {
        setEmployees(globalCache.employees);
        setFilteredEmployees(globalCache.employees);
        setDepartments(globalCache.departments);
        setLoading(false);
        return;
      }

      // 如果正在获取数据，则等待
      if (globalCache.isFetching) {
        const checkInterval = setInterval(() => {
          if (!globalCache.isFetching && globalCache.employees.length > 0) {
            setEmployees(globalCache.employees);
            setFilteredEmployees(globalCache.employees);
            setDepartments(globalCache.departments);
            setLoading(false);
            clearInterval(checkInterval);
          }
        }, 100);
        return () => clearInterval(checkInterval);
      }

      // 否则获取新数据
      try {
        globalCache.isFetching = true;
        setLoading(true);
        
        // 获取员工数据
        const employeesData = await employeeApi.getAllEmployees();
        setEmployees(employeesData);
        setFilteredEmployees(employeesData);
        globalCache.employees = employeesData;
        
        // 获取部门统计
        const statsData = await statsApi.getStats();
        setDepartments(statsData.departments || []);
        globalCache.departments = statsData.departments || [];
        
        // 更新缓存时间戳
        globalCache.lastFetchTime = Date.now();
        setError(null);
      } catch (err) {
        console.error('获取数据失败:', err);
        setError('获取数据失败，请稍后再试');
      } finally {
        setLoading(false);
        globalCache.isFetching = false;
      }
    };

    fetchData();

    // 添加路由变化监听，当用户离开页面后再回来时，保持之前的筛选和分页状态
    const handleRouteChange = (url: string) => {
      if (url === pathname) {
        // 用户回到当前页面，使用缓存的数据
        setEmployees(globalCache.employees);
        setFilteredEmployees(
          applyFilters(globalCache.employees, selectedDepartment, searchTerm)
        );
        setDepartments(globalCache.departments);
      }
    };

    // 注册路由变化监听
    window.addEventListener('popstate', () => handleRouteChange(window.location.pathname));
    
    return () => {
      window.removeEventListener('popstate', () => handleRouteChange(window.location.pathname));
    };
  }, [pathname]);

  // 提取筛选逻辑为独立函数
  const applyFilters = (data: Employee[], department: string, term: string) => {
    let results = [...data];
    
    // 按部门筛选
    if (department !== 'all') {
      results = results.filter(employee => employee.部门 === department);
    }
    
    // 按搜索词筛选
    if (term) {
      const lowercaseTerm = term.toLowerCase();
      results = results.filter(employee => 
        employee.姓名.toLowerCase().includes(lowercaseTerm) || 
        employee.职位.toLowerCase().includes(lowercaseTerm) ||
        (employee.学历 && employee.学历.toLowerCase().includes(lowercaseTerm))
      );
    }
    
    return results;
  };

  // 筛选员工
  useEffect(() => {
    const results = applyFilters(employees, selectedDepartment, searchTerm);
    setFilteredEmployees(results);
    setCurrentPage(1); // 重置为第一页
  }, [searchTerm, selectedDepartment, employees]);

  // 分页逻辑
  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstEmployee, indexOfLastEmployee);
  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);

  // 分页导航
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // 手动刷新数据
  const handleRefresh = async () => {
    try {
      setLoading(true);
      
      // 获取员工数据
      const employeesData = await employeeApi.getAllEmployees();
      setEmployees(employeesData);
      setFilteredEmployees(
        applyFilters(employeesData, selectedDepartment, searchTerm)
      );
      globalCache.employees = employeesData;
      
      // 获取部门统计
      const statsData = await statsApi.getStats();
      setDepartments(statsData.departments || []);
      globalCache.departments = statsData.departments || [];
      
      // 更新缓存时间戳
      globalCache.lastFetchTime = Date.now();
      setError(null);
    } catch (err) {
      console.error('获取数据失败:', err);
      setError('获取数据失败，请稍后再试');
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
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">员工列表</h1>
                <p className="mt-2 text-purple-100">浏览和搜索公司员工信息，查看员工详情</p>
              </div>
              <button 
                onClick={handleRefresh}
                disabled={loading}
                className="bg-white text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg font-medium shadow-sm smooth-transition flex items-center"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    刷新中...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    刷新数据
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* 内容区域 - 使用左右两栏布局 */}
        <div className="content-container flex-grow py-6">
          {/* 强制使用两栏布局，使用grid而不是flex */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ display: 'grid' }}>
            {/* 左侧：员工列表 */}
            <div className="lg:col-span-2" style={{ gridColumn: '1 / span 2' }}>
              {/* 筛选和搜索 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="md:w-1/3">
                    <label htmlFor="department" className="block text-sm font-medium mb-1 dark:text-gray-300">部门</label>
                    <select
                      id="department"
                      className="input-modern w-full"
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                    >
                      <option value="all">全部部门</option>
                      {departments.map((dept) => (
                        <option key={dept.department} value={dept.department}>
                          {dept.department} ({dept.count}人)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:w-2/3">
                    <label htmlFor="search" className="block text-sm font-medium mb-1 dark:text-gray-300">搜索</label>
                    <input
                      id="search"
                      type="text"
                      className="input-modern w-full"
                      placeholder="搜索姓名、职位或学历..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              {/* 员工列表 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                {loading ? (
                  <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                  </div>
                ) : error ? (
                  <div className="text-center py-10">
                    <p className="text-red-500">{error}</p>
                    <button 
                      onClick={handleRefresh}
                      className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 smooth-transition"
                    >
                      重试
                    </button>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-gray-500 dark:text-gray-400">没有找到匹配的员工</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto" style={{ width: '100%', maxWidth: '100%' }}>
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                              ID
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              姓名
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                              性别
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                              年龄
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              部门
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                              职位
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {currentEmployees.map((employee) => (
                            <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 smooth-transition">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 hidden sm:table-cell">
                                {employee.id}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 flex items-center justify-center text-white font-medium">
                                    {employee.姓名.charAt(0)}
                                  </div>
                                  <div className="ml-3">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{employee.姓名}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                                {employee.性别}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                                {employee.年龄}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {employee.部门}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                                {employee.职位}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <Link href={`/employees/${employee.id}`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                  详情
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* 分页 */}
                    <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="mb-3 sm:mb-0">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            显示 <span className="font-medium">{indexOfFirstEmployee + 1}</span> 到 <span className="font-medium">{Math.min(indexOfLastEmployee, filteredEmployees.length)}</span> 条，共 <span className="font-medium">{filteredEmployees.length}</span> 条结果
                          </p>
                        </div>
                        <div className="mt-3 sm:mt-0 flex justify-center sm:justify-end">
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px overflow-x-auto pb-2 max-w-full" aria-label="Pagination">
                            <button
                              onClick={() => paginate(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                            >
                              <span className="sr-only">上一页</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                              <button
                                key={number}
                                onClick={() => paginate(number)}
                                className={`relative inline-flex items-center px-4 py-2 border ${
                                  currentPage === number
                                    ? 'z-10 bg-indigo-50 dark:bg-indigo-900 border-indigo-500 dark:border-indigo-500 text-indigo-600 dark:text-indigo-200'
                                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                } text-sm font-medium`}
                              >
                                {number}
                              </button>
                            ))}
                            <button
                              onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                            >
                              <span className="sr-only">下一页</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* 右侧：统计信息面板 */}
            <div className="lg:col-span-1" style={{ gridColumn: 'auto' }}>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-[calc(var(--header-height)+1rem)]">
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">统计信息</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">关键指标和数据摘要</p>
                
                {loading ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                  </div>
                ) : error ? (
                  <div className="text-center py-6">
                    <p className="text-red-500">{error}</p>
                  </div>
                ) : (
                  <>
                    {/* 员工总数统计卡片 */}
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-4 mb-6 text-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-purple-100 text-sm">员工总数</p>
                          <h3 className="text-3xl font-bold mt-1">{employees.length}</h3>
                        </div>
                        <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-purple-100">
                        {selectedDepartment !== 'all' ? `${selectedDepartment}部门: ${filteredEmployees.length}人` : '所有部门'}
                      </div>
                    </div>
                    
                    {/* 性别比例 */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">性别比例</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg">
                          <p className="text-sm text-blue-500 dark:text-blue-300">男性</p>
                          <p className="text-xl font-bold text-blue-700 dark:text-blue-100">
                            {employees.filter(e => e.性别 === '男').length}
                          </p>
                          <p className="text-xs text-blue-500 dark:text-blue-300">
                            {Math.round(employees.filter(e => e.性别 === '男').length / employees.length * 100)}%
                          </p>
                        </div>
                        <div className="bg-pink-50 dark:bg-pink-900 p-3 rounded-lg">
                          <p className="text-sm text-pink-500 dark:text-pink-300">女性</p>
                          <p className="text-xl font-bold text-pink-700 dark:text-pink-100">
                            {employees.filter(e => e.性别 === '女').length}
                          </p>
                          <p className="text-xs text-pink-500 dark:text-pink-300">
                            {Math.round(employees.filter(e => e.性别 === '女').length / employees.length * 100)}%
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* 部门分布 */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">部门分布</h3>
                      <div className="space-y-2">
                        {departments.slice(0, 5).map((dept) => (
                          <div key={dept.department} className="flex items-center">
                            <div className="w-1/3 text-sm text-gray-600 dark:text-gray-400 truncate" title={dept.department}>
                              {dept.department}
                            </div>
                            <div className="w-2/3 pl-2">
                              <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full"
                                  style={{ width: `${Math.round(dept.count / employees.length * 100)}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs mt-1">
                                <span className="text-gray-500 dark:text-gray-400">{dept.count}人</span>
                                <span className="text-gray-500 dark:text-gray-400">{Math.round(dept.count / employees.length * 100)}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {departments.length > 5 && (
                          <div className="text-center mt-2">
                            <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                              查看全部 {departments.length} 个部门
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 年龄分布 */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">年龄分布</h3>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">平均年龄</p>
                          <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                            {employees.length > 0 ? Math.round(employees.reduce((sum, emp) => sum + emp.年龄, 0) / employees.length) : 0}岁
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">最小年龄</p>
                          <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                            {employees.length > 0 ? Math.min(...employees.map(emp => emp.年龄)) : 0}岁
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">最大年龄</p>
                          <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                            {employees.length > 0 ? Math.max(...employees.map(emp => emp.年龄)) : 0}岁
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* 其他统计信息 */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">其他指标</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">平均工作年限</span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {employees.length > 0 && employees[0]?.工作年限 ? 
                              Math.round(employees.reduce((sum, emp) => sum + (Number(emp.工作年限) || 0), 0) / employees.length) : 'N/A'} 年
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">本科及以上比例</span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {employees.length > 0 && employees[0]?.学历 ? Math.round(employees.filter(emp => ['本科', '硕士', '博士'].includes(emp.学历 || '')).length / employees.length * 100) : 'N/A'}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">管理岗位比例</span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {Math.round(employees.filter(emp => emp.职位.includes('经理') || emp.职位.includes('主管') || emp.职位.includes('总监') || emp.职位.includes('总裁')).length / employees.length * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 