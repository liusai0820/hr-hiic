'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import PageLayout from '@/components/PageLayout';
import { visualizationApi, employeeApi } from '@/services/api';
import ECharts from '@/components/ECharts';
import { motion } from 'framer-motion';
import * as echarts from 'echarts';
import EmployeeListDialog from '@/components/dialogs/EmployeeListDialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface VisualizationData {
  title: string;
  description: string;
  xAxis?: string[];
  yAxis?: number[];
  labels?: string[];
  values?: number[];
  data: Record<string, number>;
  stats?: Record<string, number>;
}

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

export default function VisualizationsPage() {
  const [visualizations, setVisualizations] = useState<Record<string, VisualizationData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('department');
  const [darkMode, setDarkMode] = useState(false);
  const [useDemo, setUseDemo] = useState(false);
  
  // 员工列表状态
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  
  // 员工列表分页和筛选状态
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const employeesPerPage = 20;
  
  // 员工列表对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogEmployees, setDialogEmployees] = useState([]);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState(null);

  // 示例数据
  const demoData: Record<string, VisualizationData> = {
    department: {
      title: '部门人员分布（示例数据）',
      description: '各部门人员数量分布情况',
      data: {
        '技术部': 120,
        '市场部': 80,
        '销售部': 100,
        '人力资源部': 40,
        '财务部': 30,
        '行政部': 25,
        '产品部': 65,
        '客服部': 45
      },
      stats: {
        '部门总数': 8,
        '平均人数': 63,
        '最大部门': 120,
        '最小部门': 25
      }
    },
    gender: {
      title: '性别比例分布（示例数据）',
      description: '公司员工性别比例分布',
      data: {
        '男': 280,
        '女': 225
      },
      stats: {
        '总人数': 505,
        '男性比例': 55,
        '女性比例': 45
      }
    },
    age: {
      title: '年龄分布（示例数据）',
      description: '公司员工年龄段分布',
      data: {
        '20-25岁': 85,
        '26-30岁': 160,
        '31-35岁': 120,
        '36-40岁': 80,
        '41-45岁': 40,
        '46-50岁': 15,
        '50岁以上': 5
      },
      stats: {
        '平均年龄': 32,
        '最大年龄': 58,
        '最小年龄': 22
      }
    },
    education: {
      title: '学历分布（示例数据）',
      description: '公司员工学历层次分布',
      data: {
        '博士': 15,
        '硕士': 120,
        '本科': 280,
        '大专': 75,
        '其他': 15
      },
      stats: {
        '研究生比例': 27,
        '本科比例': 55,
        '其他比例': 18
      }
    },
    university: {
      title: '高校分布（示例数据）',
      description: '员工毕业院校TOP10分布',
      data: {
        '清华大学': 25,
        '北京大学': 20,
        '浙江大学': 18,
        '复旦大学': 15,
        '上海交通大学': 14,
        '南京大学': 12,
        '中国人民大学': 10,
        '武汉大学': 9,
        '华中科技大学': 8,
        '四川大学': 7
      }
    },
    work_years: {
      title: '工作年限分布（示例数据）',
      description: '员工工作年限分布情况',
      data: {
        '1年以下': 60,
        '1-3年': 120,
        '3-5年': 150,
        '5-10年': 100,
        '10年以上': 75
      },
      stats: {
        '平均工作年限': 5.2,
        '新员工比例': 12,
        '资深员工比例': 15
      }
    }
  };

  // 检测系统暗色模式
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(isDarkMode);
      
      // 监听系统主题变化
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // 从URL参数中获取活动标签
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && ['department', 'gender', 'age', 'education', 'university', 'work_years', 'employees'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  useEffect(() => {
    const fetchVisualizations = async () => {
      try {
        setLoading(true);
        console.log('开始获取可视化数据...');
        
        // 更新API路径
        const response = await fetch('/api/api/visualizations');
        if (!response.ok) {
          throw new Error(`获取可视化数据失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('获取到的可视化数据:', data);
        
        // 检查返回的数据是否为空或无效
        const isDataValid = data && Object.keys(data).length > 0;
        
        if (isDataValid) {
          // 检查每个分类是否包含error字段，如果有，则用示例数据替换
          const enhancedData = { ...data };
          let hasErrorData = false;
          
          // 检查所有可视化数据中是否有错误
          Object.keys(enhancedData).forEach(key => {
            if (enhancedData[key].error) {
              console.log(`发现错误数据: ${key}, 错误: ${enhancedData[key].error}, 使用示例数据替换`);
              enhancedData[key] = demoData[key];
              hasErrorData = true;
            }
          });
          
          setVisualizations(enhancedData);
          setUseDemo(hasErrorData);
          console.log('使用' + (hasErrorData ? '部分' : '全部') + '真实数据');
        } else {
          console.log('API返回的数据为空，使用示例数据');
          setVisualizations(demoData);
          setUseDemo(true);
        }
        
        setError(null);
      } catch (err) {
        console.error('获取可视化数据失败:', err);
        setError('获取数据失败，已切换到示例数据模式');
        setVisualizations(demoData);
        setUseDemo(true);
      } finally {
        setLoading(false);
      }
    };

    fetchVisualizations();
  }, []);

  // 获取员工列表数据
  useEffect(() => {
    if (activeTab === 'employees') {
      const fetchEmployees = async () => {
        try {
          setEmployeesLoading(true);
          console.log('开始获取员工列表数据...');
          
          const data = await employeeApi.getAllEmployees();
          console.log(`获取到${data.length}条员工记录`);
          
          setEmployees(data);
          setFilteredEmployees(data); // 初始化筛选后的员工列表
          setEmployeesError(null);
        } catch (err) {
          console.error('获取员工列表数据失败:', err);
          setEmployeesError('获取员工列表数据失败，请稍后再试');
          setEmployees([]);
          setFilteredEmployees([]);
        } finally {
          setEmployeesLoading(false);
        }
      };

      fetchEmployees();
    }
  }, [activeTab]);

  const tabs = [
    { id: 'department', label: '部门分布', icon: '🏢' },
    { id: 'gender', label: '性别分布', icon: '👥' },
    { id: 'age', label: '年龄分布', icon: '📊' },
    { id: 'education', label: '学历分布', icon: '🎓' },
    { id: 'university', label: '高校分布', icon: '🏫' },
    { id: 'work_years', label: '工作年限', icon: '⏱️' },
    { id: 'employees', label: '员工列表', icon: '👨‍💼' },
  ];

  // 获取图表配置
  const getChartOption = (type: string, data: VisualizationData) => {
    // 确保data.data存在，否则使用空对象
    const safeData = data?.data || {};
    
    // 设置主题颜色
    const themeColors = darkMode ? 
      ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'] :
      ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];
    
    // 文本颜色
    const textColor = darkMode ? '#e1e1e1' : '#333';
    
    // 基础配置
    const baseOption = {
      backgroundColor: 'transparent',
      textStyle: {
        color: textColor
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: darkMode ? '#555' : '#ddd',
        textStyle: {
          color: darkMode ? '#fff' : '#333'
        },
        extraCssText: 'box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); border-radius: 8px; padding: 10px;'
      },
      legend: {
        textStyle: {
          color: textColor
        }
      },
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      animationDelay: (idx: number) => idx * 100
    };
    
    // 根据类型返回不同的图表配置
    switch (type) {
      case 'department':
        return {
          ...baseOption,
          tooltip: {
            ...baseOption.tooltip,
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          legend: {
            ...baseOption.legend,
            orient: 'vertical',
            left: 'left',
            top: 'middle'
          },
          series: [
            {
              name: '部门人数',
              type: 'pie',
              radius: ['40%', '70%'],
              avoidLabelOverlap: false,
              itemStyle: {
                borderRadius: 10,
                borderColor: darkMode ? '#222' : '#fff',
                borderWidth: 2
              },
              label: {
                show: false,
                position: 'center',
                color: textColor
              },
              emphasis: {
                label: {
                  show: true,
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: textColor
                },
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              },
              labelLine: {
                show: false
              },
              data: Object.entries(safeData).map(([name, value], index) => ({ 
                name, 
                value,
                itemStyle: {
                  color: themeColors[index % themeColors.length]
                }
              }))
            }
          ]
        };
      
      case 'gender':
        return {
          ...baseOption,
          legend: {
            ...baseOption.legend,
            orient: 'vertical',
            left: 'left',
            top: 'middle'
          },
          series: [
            {
              name: '性别分布',
              type: 'pie',
              radius: '50%',
              center: ['50%', '50%'],
              data: Object.entries(safeData).map(([name, value], index) => ({ 
                name, 
                value,
                itemStyle: {
                  color: index === 0 ? '#5470c6' : '#ee6666'
                }
              })),
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              },
              label: {
                formatter: '{b}: {c} ({d}%)',
                color: textColor
              }
            }
          ]
        };
      
      case 'age':
        return {
          ...baseOption,
          tooltip: {
            ...baseOption.tooltip,
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            }
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: Object.keys(safeData),
            axisLine: {
              lineStyle: {
                color: darkMode ? '#555' : '#ccc'
              }
            },
            axisLabel: {
              color: textColor
            }
          },
          yAxis: {
            type: 'value',
            axisLine: {
              lineStyle: {
                color: darkMode ? '#555' : '#ccc'
              }
            },
            axisLabel: {
              color: textColor
            },
            splitLine: {
              lineStyle: {
                color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }
            }
          },
          series: [
            {
              data: Object.values(safeData),
              type: 'bar',
              showBackground: true,
              backgroundStyle: {
                color: darkMode ? 'rgba(180, 180, 180, 0.1)' : 'rgba(180, 180, 180, 0.2)'
              },
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: darkMode ? '#5470c6' : '#83bff6' },
                  { offset: 1, color: darkMode ? '#3a5cad' : '#188df0' }
                ]),
                borderRadius: [4, 4, 0, 0]
              },
              emphasis: {
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: darkMode ? '#6b8de6' : '#a4d8fd' },
                    { offset: 1, color: darkMode ? '#4b6fd0' : '#4ba6f0' }
                  ])
                }
              }
            }
          ]
        };
      
      case 'education':
        return {
          ...baseOption,
          tooltip: {
            ...baseOption.tooltip,
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          legend: {
            ...baseOption.legend,
            orient: 'vertical',
            left: 'left',
            top: 'middle'
          },
          series: [
            {
              name: '学历分布',
              type: 'pie',
              radius: ['30%', '60%'],
              center: ['50%', '50%'],
              roseType: 'radius',
              label: {
                formatter: '{b}: {c}',
                color: textColor
              },
              data: Object.entries(safeData).map(([name, value], index) => ({ 
                name, 
                value,
                itemStyle: {
                  color: themeColors[index % themeColors.length]
                }
              })),
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              }
            }
          ]
        };
      
      case 'university':
        return {
          ...baseOption,
          tooltip: {
            ...baseOption.tooltip,
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            }
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          xAxis: {
            type: 'value',
            axisLine: {
              lineStyle: {
                color: darkMode ? '#555' : '#ccc'
              }
            },
            axisLabel: {
              color: textColor
            },
            splitLine: {
              lineStyle: {
                color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }
            }
          },
          yAxis: {
            type: 'category',
            data: Object.keys(safeData),
            axisLine: {
              lineStyle: {
                color: darkMode ? '#555' : '#ccc'
              }
            },
            axisLabel: {
              color: textColor
            }
          },
          series: [
            {
              name: '人数',
              type: 'bar',
              data: Object.values(safeData),
              itemStyle: {
                color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                  { offset: 0, color: darkMode ? '#3a5cad' : '#188df0' },
                  { offset: 1, color: darkMode ? '#5470c6' : '#83bff6' }
                ]),
                borderRadius: [0, 4, 4, 0]
              },
              emphasis: {
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                    { offset: 0, color: darkMode ? '#4b6fd0' : '#4ba6f0' },
                    { offset: 1, color: darkMode ? '#6b8de6' : '#a4d8fd' }
                  ])
                }
              }
            }
          ]
        };
      
      case 'work_years':
        return {
          ...baseOption,
          tooltip: {
            ...baseOption.tooltip,
            trigger: 'axis'
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: Object.keys(safeData),
            axisLine: {
              lineStyle: {
                color: darkMode ? '#555' : '#ccc'
              }
            },
            axisLabel: {
              color: textColor
            }
          },
          yAxis: {
            type: 'value',
            axisLine: {
              lineStyle: {
                color: darkMode ? '#555' : '#ccc'
              }
            },
            axisLabel: {
              color: textColor
            },
            splitLine: {
              lineStyle: {
                color: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
              }
            }
          },
          series: [
            {
              name: '人数',
              type: 'line',
              stack: 'Total',
              smooth: true,
              lineStyle: {
                width: 3,
                color: darkMode ? '#5470c6' : '#5470c6'
              },
              showSymbol: true,
              areaStyle: {
                opacity: 0.8,
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: darkMode ? 'rgba(84, 112, 198, 0.7)' : 'rgba(84, 112, 198, 0.5)' },
                  { offset: 1, color: darkMode ? 'rgba(84, 112, 198, 0.1)' : 'rgba(84, 112, 198, 0.1)' }
                ])
              },
              emphasis: {
                focus: 'series'
              },
              data: Object.values(safeData)
            }
          ]
        };
      
      default:
        return baseOption;
    }
  };

  // 渲染统计数据
  const renderStats = (stats?: Record<string, number>) => {
    if (!stats) return null;
    
    // 指标解释数据
    const statsExplanations: Record<string, string> = {
      '高学历比例': '拥有硕士及以上学历的员工百分比',
      '本科比例': '拥有本科学历的员工百分比',
      '硕士及以上比例': '拥有硕士及以上学历的员工百分比',
      '海外学历占比': '拥有海外院校学历的员工百分比',
      '最高学历人数': '拥有最多人数的学历类型的人数',
      '最高学历占比': '最多人数的学历类型占总人数的百分比',
      '学历多样性指数': '衡量学历分布的多样性，值越高表示学历分布越均衡',
      '研究生以上比例': '拥有研究生及以上学历的员工百分比',
      '学历结构评分': '基于各学历权重计算的综合评分（博士1.0，硕士0.8，本科0.6等），满分100分，分数越高表示整体学历水平越高'
    };
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {Object.entries(stats).map(([key, value], index) => {
          // 跳过值为0的统计项，除非是必要的计数项（如总数）
          if (value === 0 && !['总人数', '部门总数', '最小部门', '最小年龄'].includes(key)) {
            return null;
          }
          
          return (
            <motion.div 
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col items-center justify-center relative group"
            >
              <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1 whitespace-nowrap">{key}</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {key.includes('比例') || key.includes('占比') ? `${value}%` : value}
              </p>
              
              {/* 悬停提示 */}
              {statsExplanations[key] && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                  {statsExplanations[key]}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    );
  };

  // 渲染员工统计信息
  const renderEmployeeStats = () => {
    if (!employees || employees.length === 0) return null;
    
    // 使用筛选后的员工数据进行统计，而不是全部员工
    const statsData = filteredEmployees;
    
    // 计算学历结构评分
    const calculateEducationScore = (employees: Employee[]) => {
      if (!employees || employees.length === 0) return 0;
      
      // 统计各学历人数
      const eduCounts: Record<string, number> = {};
      let totalWithEdu = 0;
      
      employees.forEach(emp => {
        if (emp.学历) {
          eduCounts[emp.学历] = (eduCounts[emp.学历] || 0) + 1;
          totalWithEdu++;
        }
      });
      
      if (totalWithEdu === 0) return 0;
      
      // 定义各学历权重
      const weights: Record<string, number> = {
        '博士研究生': 1.0,
        '博士': 1.0,
        '硕士研究生': 0.8,
        '硕士': 0.8,
        '本科': 0.6,
        '大学本科': 0.6,
        '大专': 0.4,
        '高中': 0.2,
        '其他': 0.1
      };
      
      // 计算加权分数
      let score = 0;
      for (const [edu, count] of Object.entries(eduCounts)) {
        // 根据学历名称匹配最合适的权重
        let weight = 0.1; // 默认权重
        for (const [eduKey, eduWeight] of Object.entries(weights)) {
          if (edu.includes(eduKey)) {
            weight = eduWeight;
            break;
          }
        }
        score += (count / totalWithEdu) * weight;
      }
      
      // 归一化到100分制
      return Math.round(score * 100);
    };

    // 计算海外学历占比
    const calculateOverseasEducationRatio = (employees: Employee[]) => {
      if (!employees || employees.length === 0) return 0;
      
      // 统计海外学历人数
      const overseasCount = employees.filter(emp => {
        const university = typeof emp.毕业院校 === 'string' ? emp.毕业院校 : '';
        return university && (
          university.includes('海外') || 
          university.includes('国外') || 
          university.includes('University') || 
          university.includes('College') ||
          university.includes('Institute') ||
          /^[A-Za-z]/.test(university) || // 以英文字母开头的院校名
          university.includes('香港') ||
          university.includes('澳门') ||
          university.includes('台湾')
        );
      }).length;
      
      // 计算比例
      return employees.length > 0 ? Math.round((overseasCount / employees.length) * 100) : 0;
    };
    
    // 计算985/211院校比例
    const calculate985211Ratio = (employees: Employee[]) => {
      if (!employees || employees.length === 0) return 0;
      
      // 统计985/211院校人数
      const eliteCount = employees.filter(emp => {
        const university = typeof emp.毕业院校 === 'string' ? emp.毕业院校 : '';
        // 这里可以添加更完整的985/211院校列表判断
        return university && (
          university.includes('清华') || 
          university.includes('北大') || 
          university.includes('复旦') || 
          university.includes('上海交通') ||
          university.includes('浙江大学') ||
          university.includes('南京大学') ||
          university.includes('中国科学技术大学') ||
          university.includes('武汉大学') ||
          university.includes('华中科技') ||
          university.includes('西安交通') ||
          university.includes('哈尔滨工业') ||
          university.includes('南开') ||
          university.includes('天津大学') ||
          university.includes('同济') ||
          university.includes('北京航空') ||
          university.includes('北京理工')
        );
      }).length;
      
      // 计算比例
      return employees.length > 0 ? Math.round((eliteCount / employees.length) * 100) : 0;
    };
    
    // 指标解释数据
    const statsExplanations: Record<string, string> = {
      '总员工数': '公司员工的总数量',
      '当前筛选': '当前筛选条件下的员工数量',
      '性别分布': '当前筛选条件下的男女员工比例',
      '年龄统计': '当前筛选条件下的员工年龄统计',
      '平均年龄': '当前筛选员工的平均年龄',
      '最小年龄': '当前筛选员工中最年轻的年龄',
      '最大年龄': '当前筛选员工中最年长的年龄',
      '平均工作年限': '当前筛选员工的平均工作年限',
      '高学历比例': '当前筛选员工中拥有本科及以上学历的比例',
      '硕士及以上比例': '当前筛选员工中拥有硕士及以上学历的比例',
      '博士比例': '当前筛选员工中拥有博士学历的比例',
      '海外学历占比': '当前筛选员工中拥有海外院校学历的比例',
      '985/211院校比例': '当前筛选员工中毕业于985/211重点院校的比例',
      '管理岗比例': '当前筛选员工中担任管理职位的比例',
      '学历结构评分': '基于各学历权重计算的综合评分（博士1.0，硕士0.8，本科0.6等），满分100分，分数越高表示整体学历水平越高'
    };
    
    // 计算学历结构评分
    const educationScore = calculateEducationScore(statsData);
    
    // 计算高学历比例
    const highEduCount = statsData.filter(emp => {
      const edu = emp.学历 || '';
      return edu.includes('本科') || edu.includes('硕士') || edu.includes('博士');
    }).length;
    const highEduRatio = statsData.length > 0 ? Math.round(highEduCount / statsData.length * 100) : 0;
    
    // 计算硕士及以上比例
    const masterAboveCount = statsData.filter(emp => {
      const edu = emp.学历 || '';
      return edu.includes('硕士') || edu.includes('博士');
    }).length;
    const masterAboveRatio = statsData.length > 0 ? Math.round(masterAboveCount / statsData.length * 100) : 0;
    
    // 计算博士比例
    const doctorCount = statsData.filter(emp => {
      const edu = emp.学历 || '';
      return edu.includes('博士');
    }).length;
    const doctorRatio = statsData.length > 0 ? Math.round(doctorCount / statsData.length * 100) : 0;
    
    // 计算海外学历占比
    const overseasEduRatio = calculateOverseasEducationRatio(statsData);
    
    // 计算985/211院校比例
    const elite985211Ratio = calculate985211Ratio(statsData);
    
    // 计算管理岗比例
    const managerCount = statsData.filter(emp => {
      return emp.职位?.includes('经理') || 
        emp.职位?.includes('主管') || 
        emp.职位?.includes('总监') || 
        emp.职位?.includes('总裁') || false;
    }).length;
    const managerRatio = statsData.length > 0 ? Math.round(managerCount / statsData.length * 100) : 0;
    
    return (
      <div className="modern-card">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="text-xl font-semibold">员工统计</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">关键指标和数据摘要</p>
        </div>
        <div className="p-4 space-y-6">
          {/* 总员工数 */}
          <div className="relative group">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">总员工数</h3>
            <h3 className="text-3xl font-bold mt-1">{employees.length}</h3>
            
            {/* 悬停提示 */}
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
              <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
              {statsExplanations['总员工数']}
            </div>
          </div>
          
          {/* 当前筛选 */}
          <div className="relative group">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">当前筛选</h3>
            <p className="text-lg font-medium mt-1 whitespace-normal">
              {selectedDepartment !== 'all' ? `${selectedDepartment}部门: ${filteredEmployees.length}人` : `所有部门: ${filteredEmployees.length}人`}
            </p>
            
            {/* 悬停提示 */}
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
              <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
              {statsExplanations['当前筛选']}
            </div>
          </div>
          
          {/* 性别分布 */}
          <div className="relative group">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">性别分布</h3>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">男性</div>
                <div className="text-2xl font-bold mt-1">
                  {statsData.filter(e => e.性别 === '男').length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {statsData.length > 0 ? Math.round(statsData.filter(e => e.性别 === '男').length / statsData.length * 100) : 0}%
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg">
                <div className="text-purple-600 dark:text-purple-400 text-sm font-medium">女性</div>
                <div className="text-2xl font-bold mt-1">
                  {statsData.filter(e => e.性别 === '女').length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {statsData.length > 0 ? Math.round(statsData.filter(e => e.性别 === '女').length / statsData.length * 100) : 0}%
                </div>
              </div>
            </div>
            
            {/* 悬停提示 */}
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
              <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
              {statsExplanations['性别分布']}
            </div>
          </div>
          
          {/* 年龄统计 */}
          <div className="relative group">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">年龄统计</h3>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg relative group">
                <div className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">平均年龄</div>
                <div className="text-xl font-bold mt-1">
                  {statsData.length > 0 ? Math.round(statsData.reduce((sum, emp) => sum + emp.年龄, 0) / statsData.length) : '-'}岁
                </div>
                
                {/* 悬停提示 */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                  {statsExplanations['平均年龄']}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg relative group">
                <div className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">最小年龄</div>
                <div className="text-xl font-bold mt-1">
                  {statsData.length > 0 ? Math.min(...statsData.map(emp => emp.年龄)) : '-'}岁
                </div>
                
                {/* 悬停提示 */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                  {statsExplanations['最小年龄']}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg relative group">
                <div className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">最大年龄</div>
                <div className="text-xl font-bold mt-1">
                  {statsData.length > 0 ? Math.max(...statsData.map(emp => emp.年龄)) : '-'}岁
                </div>
                
                {/* 悬停提示 */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                  {statsExplanations['最大年龄']}
                </div>
              </div>
            </div>
            
            {/* 悬停提示 */}
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
              <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
              {statsExplanations['年龄统计']}
            </div>
          </div>
          
          {/* 其他统计 */}
          <div className="grid grid-cols-2 gap-4">
            {statsData.length > 0 && statsData.some(emp => emp.工作年限) && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg relative group">
                <div className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">平均工作年限</div>
                <div className="text-xl font-bold mt-1">
                  {Math.round(statsData.reduce((sum, emp) => sum + (Number(emp.工作年限) || 0), 0) / statsData.filter(emp => emp.工作年限).length)} 年
                </div>
                
                {/* 悬停提示 */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                  {statsExplanations['平均工作年限']}
                </div>
              </div>
            )}
            
            {highEduCount > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg relative group">
                <div className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">高学历比例</div>
                <div className="text-xl font-bold mt-1">
                  {highEduRatio}%
                </div>
                
                {/* 悬停提示 */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                  {statsExplanations['高学历比例']}
                </div>
              </div>
            )}
            
            {masterAboveCount > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg relative group">
                <div className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">硕士及以上比例</div>
                <div className="text-xl font-bold mt-1">
                  {masterAboveRatio}%
                </div>
                
                {/* 悬停提示 */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                  {statsExplanations['硕士及以上比例']}
                </div>
              </div>
            )}
            
            {doctorCount > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg relative group">
                <div className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">博士比例</div>
                <div className="text-xl font-bold mt-1">
                  {doctorRatio}%
                </div>
                
                {/* 悬停提示 */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                  {statsExplanations['博士比例']}
                </div>
              </div>
            )}
            
            {overseasEduRatio > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg relative group">
                <div className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">海外学历占比</div>
                <div className="text-xl font-bold mt-1">
                  {overseasEduRatio}%
                </div>
                
                {/* 悬停提示 */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                  {statsExplanations['海外学历占比']}
                </div>
              </div>
            )}
            
            {elite985211Ratio > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg relative group">
                <div className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">985/211院校比例</div>
                <div className="text-xl font-bold mt-1">
                  {elite985211Ratio}%
                </div>
                
                {/* 悬停提示 */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                  {statsExplanations['985/211院校比例']}
                </div>
              </div>
            )}
            
            {managerCount > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg relative group">
                <div className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">管理岗比例</div>
                <div className="text-xl font-bold mt-1">
                  {managerRatio}%
                </div>
                
                {/* 悬停提示 */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                  {statsExplanations['管理岗比例']}
                </div>
              </div>
            )}
            
            {educationScore > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg relative group">
                <div className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">学历结构评分</div>
                <div className="text-xl font-bold mt-1">
                  {educationScore}
                </div>
                
                {/* 悬停提示 */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-800 text-white text-xs rounded p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 pointer-events-none">
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                  {statsExplanations['学历结构评分']}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 使用useMemo缓存当前可视化数据
  const currentVisualization = useMemo(() => {
    return visualizations[activeTab];
  }, [visualizations, activeTab]);

  // 处理图表点击事件
  const handleChartClick = async (params: any) => {
    const category = params.name;
    const visualizationType = activeTab;
    
    // 设置对话框标题
    let title = '';
    switch (visualizationType) {
      case 'age':
        title = `年龄段: ${category}`;
        break;
      case 'department':
        title = `部门: ${category}`;
        break;
      case 'gender':
        title = `性别: ${category}`;
        break;
      case 'education':
        title = `学历: ${category}`;
        break;
      case 'university':
        title = `毕业院校: ${category}`;
        break;
      case 'work_years':
        title = `工作年限: ${category}`;
        break;
      default:
        title = category;
    }
    setDialogTitle(title);
    
    // 打开对话框并加载数据
    setDialogOpen(true);
    setDialogLoading(true);
    setDialogError(null);
    
    try {
      console.log(`正在获取${visualizationType}类型下的${category}分类员工列表...`);
      const response = await fetch(`/api/api/visualizations/employees/${visualizationType}?category=${encodeURIComponent(category)}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`获取员工列表失败: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`获取员工列表失败: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`获取到${result.total}名员工数据:`, result);
      setDialogEmployees(result.employees || []);
    } catch (err: any) {
      console.error('获取员工列表出错:', err);
      setDialogError(err.message);
    } finally {
      setDialogLoading(false);
    }
  };

  // 关闭对话框
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // 获取部门列表
  const getDepartments = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    const departments = [...new Set(employees.map(emp => emp.部门))];
    return departments;
  }, [employees]);
  
  // 应用筛选
  const applyFilters = (data: Employee[], department: string, term: string) => {
    return data.filter(employee => {
      // 部门筛选
      const departmentMatch = department === 'all' || employee.部门 === department;
      
      // 搜索词筛选
      const searchMatch = term === '' || 
        employee.姓名?.toLowerCase().includes(term.toLowerCase()) ||
        employee.职位?.toLowerCase().includes(term.toLowerCase()) ||
        (employee.学历 && employee.学历.toLowerCase().includes(term.toLowerCase()));
      
      return departmentMatch && searchMatch;
    });
  };
  
  // 监听筛选条件变化
  useEffect(() => {
    if (employees.length > 0) {
      const results = applyFilters(employees, selectedDepartment, searchTerm);
      setFilteredEmployees(results);
      setCurrentPage(1); // 重置到第一页
    }
  }, [searchTerm, selectedDepartment, employees]);
  
  // 分页处理
  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstEmployee, indexOfLastEmployee);
  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);
  
  // 分页导航
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // 渲染员工列表
  const renderEmployeeList = () => {
    if (employeesLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      );
    }

    if (employeesError) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{employeesError}</p>
        </div>
      );
    }

    if (!employees || employees.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          没有找到员工数据
        </div>
      );
    }
    
    if (filteredEmployees.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          没有符合筛选条件的员工
        </div>
      );
    }

    return (
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {currentEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 smooth-transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{employee.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Link href={`/employees/${employee.id}`} className="flex-shrink-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-medium cursor-pointer hover:opacity-80 transition-opacity ${employee.性别 === '女' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                          {employee.姓名?.substring(0, 1)}
                        </div>
                      </Link>
                      <div className="ml-4">
                        <Link href={`/employees/${employee.id}`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">
                          {employee.姓名}
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{employee.性别}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{employee.年龄}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{employee.部门}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{employee.职位}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/employees/${employee.id}`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                      详情
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* 分页控件 */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            显示 <span className="font-medium">{indexOfFirstEmployee + 1}</span> 到 <span className="font-medium">{Math.min(indexOfLastEmployee, filteredEmployees.length)}</span> 条，共 <span className="font-medium">{filteredEmployees.length}</span> 条结果
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              上一页
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // 显示当前页附近的页码
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => paginate(pageNum)}
                  className={`px-3 py-1 rounded ${
                    currentPage === pageNum
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <PageLayout>
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col">
        {/* 页面标题 */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <div className="content-container py-8">
            <h1 className="text-3xl font-bold">数据可视化</h1>
            <p className="mt-2 text-purple-100">探索和分析公司人力资源数据</p>
          </div>
        </div>
        
        {/* 内容区域 */}
        <div className="content-container flex-grow">
          {/* 选项卡 */}
          <div className="flex flex-wrap gap-2 mb-6 mt-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          
          {/* 加载状态 */}
          {loading && activeTab !== 'employees' && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          )}
          
          {/* 错误信息 */}
          {error && activeTab !== 'employees' && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p>{error}</p>
              {useDemo && <p className="mt-2">已切换到示例数据模式</p>}
            </div>
          )}
          
          {/* 可视化内容 */}
          {!loading && !error && activeTab !== 'employees' && visualizations[activeTab] && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 图表区域 */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="modern-card h-[500px] flex flex-col"
                >
                  <div className="p-4 border-b border-[var(--border)]">
                    <h2 className="text-xl font-semibold">{visualizations[activeTab].title}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{visualizations[activeTab].description}</p>
                    {useDemo && (
                      <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-2 rounded">
                        注意：当前显示的是示例数据，非实际公司数据
                      </div>
                    )}
                  </div>
                  <div className="flex-grow p-4">
                    <ECharts
                      option={getChartOption(activeTab, visualizations[activeTab])}
                      style={{ height: '100%', width: '100%' }}
                      onEvents={{
                        click: handleChartClick
                      }}
                    />
                  </div>
                </motion.div>
              </div>
              
              {/* 统计信息 */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="modern-card"
                >
                  <div className="p-4 border-b border-[var(--border)]">
                    <h2 className="text-xl font-semibold">统计信息</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">关键指标和数据摘要</p>
                  </div>
                  <div className="p-4">
                    {renderStats(visualizations[activeTab].stats)}
                  </div>
                </motion.div>
              </div>
            </div>
          )}
          
          {/* 员工列表内容 */}
          {activeTab === 'employees' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">员工列表</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  浏览公司所有员工信息，点击员工姓名查看详细资料
                </p>
              </div>
              
              {/* 筛选和搜索 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="department-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    按部门筛选
                  </label>
                  <select
                    id="department-filter"
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                  >
                    <option value="all">所有部门</option>
                    {getDepartments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="search-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    搜索员工
                  </label>
                  <input
                    id="search-filter"
                    type="text"
                    placeholder="搜索姓名、职位或学历..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                  />
                </div>
              </div>
              
              {/* 两列布局 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左侧员工列表 */}
                <div className="lg:col-span-2">
                  {renderEmployeeList()}
                </div>
                
                {/* 右侧统计面板 */}
                <div>
                  {renderEmployeeStats()}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      
      {/* 员工列表对话框 */}
      <EmployeeListDialog
        open={dialogOpen}
        title={dialogTitle}
        employees={dialogEmployees}
        loading={dialogLoading}
        error={dialogError}
        onClose={handleCloseDialog}
      />
    </PageLayout>
  );
} 