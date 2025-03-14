'use client';

import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import { employeeApi, statsApi } from '@/services/api';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

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
  const employeesPerPage = 10;
  const router = useRouter();
  const pathname = usePathname();

  // 数据缓存有效期（毫秒），设置为5分钟
  const CACHE_DURATION = 5 * 60 * 1000;

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
                <h1 className="text-3xl font-bold">员工数据</h1>
                <p className="mt-2 text-purple-100">浏览和搜索公司员工信息</p>
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
        
        {/* 内容区域 */}
        <div className="content-container flex-grow">
          {/* 筛选和搜索 */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="md:w-1/3">
              <label htmlFor="department" className="block text-sm font-medium mb-1">部门</label>
              <select
                id="department"
                className="input-modern"
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
              <label htmlFor="search" className="block text-sm font-medium mb-1">搜索</label>
              <input
                id="search"
                type="text"
                className="input-modern"
                placeholder="搜索姓名、职位或学历..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* 加载状态 */}
          {loading && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          )}
          
          {/* 错误信息 */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p>{error}</p>
            </div>
          )}
          
          {/* 员工表格 */}
          {!loading && !error && (
            <>
              <div className="modern-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">姓名</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">性别</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">年龄</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">部门</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">职位</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">学历</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {currentEmployees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 smooth-transition">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{employee.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link 
                              href={`/employees/${employee.id}`}
                              className="text-gray-900 dark:text-gray-100 hover:text-purple-600 dark:hover:text-purple-400 smooth-transition"
                            >
                              {employee.姓名}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{employee.性别}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{employee.年龄}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{employee.部门}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{employee.职位}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{employee.学历}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Link 
                              href={`/employees/${employee.id}`}
                              className="text-purple-600 hover:text-purple-900 dark:hover:text-purple-400 smooth-transition"
                            >
                              详情
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* 分页 */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 flex items-center justify-between border-t border-[var(--border)]">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        显示 {indexOfFirstEmployee + 1}-{Math.min(indexOfLastEmployee, filteredEmployees.length)} 条，共 {filteredEmployees.length} 条
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                        <button
                          key={number}
                          onClick={() => paginate(number)}
                          className={`px-3 py-1 rounded-md text-sm ${
                            currentPage === number
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                          } smooth-transition`}
                        >
                          {number}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {filteredEmployees.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  没有找到匹配的员工数据
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
} 