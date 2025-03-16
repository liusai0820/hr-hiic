'use client';

import { useState, useEffect, useMemo } from 'react';
import PageLayout from '@/components/PageLayout';
import { visualizationApi } from '@/services/api';
import ECharts from '@/components/ECharts';
import { motion } from 'framer-motion';
import * as echarts from 'echarts';
import EmployeeListDialog from '@/components/dialogs/EmployeeListDialog';

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

export default function VisualizationsPage() {
  const [visualizations, setVisualizations] = useState<Record<string, VisualizationData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('department');
  const [darkMode, setDarkMode] = useState(false);
  const [useDemo, setUseDemo] = useState(false);
  
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

  useEffect(() => {
    const fetchVisualizations = async () => {
      try {
        setLoading(true);
        console.log('开始获取可视化数据...');
        
        // 直接使用fetch而不是通过API服务
        const response = await fetch('/api/visualizations');
        if (!response.ok) {
          throw new Error(`获取可视化数据失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('获取到的可视化数据:', data);
        
        // 检查返回的数据是否为空或无效
        const isDataValid = data && Object.keys(data).length > 0;
        
        if (isDataValid) {
          setVisualizations(data);
          setUseDemo(false);
          console.log('使用真实数据');
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

  const tabs = [
    { id: 'department', label: '部门分布', icon: '🏢' },
    { id: 'gender', label: '性别分布', icon: '👥' },
    { id: 'age', label: '年龄分布', icon: '📊' },
    { id: 'education', label: '学历分布', icon: '🎓' },
    { id: 'university', label: '高校分布', icon: '🏫' },
    { id: 'work_years', label: '工作年限', icon: '⏱️' },
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
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {Object.entries(stats).map(([key, value], index) => (
          <motion.div 
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col items-center justify-center"
          >
            <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">{key}</h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{value}</p>
          </motion.div>
        ))}
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
      const response = await fetch(`/api/visualizations/employees/${visualizationType}?category=${encodeURIComponent(category)}`);
      if (!response.ok) {
        throw new Error('获取员工列表失败');
      }
      const result = await response.json();
      setDialogEmployees(result.employees || []);
    } catch (err: any) {
      setDialogError(err.message);
    } finally {
      setDialogLoading(false);
    }
  };

  // 关闭对话框
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">HR数据可视化</h1>
              <p className="text-gray-600 dark:text-gray-300">探索和分析人力资源数据，获取关键洞察</p>
            </div>
            {useDemo && (
              <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-md text-sm">
                示例数据模式
              </div>
            )}
          </div>
        </motion.div>

        {/* 主题切换按钮 */}
        <div className="flex justify-end mb-4">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {darkMode ? (
              <>
                <span>☀️</span>
                <span>亮色模式</span>
              </>
            ) : (
              <>
                <span>🌙</span>
                <span>暗色模式</span>
              </>
            )}
          </button>
        </div>

        {/* 标签页导航 */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex space-x-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-80">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">加载数据中...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-80">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <p className="text-red-500 dark:text-red-400">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                重试
              </button>
            </div>
          ) : currentVisualization ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{currentVisualization.title}</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">{currentVisualization.description}</p>
              </div>
              
              <div className={`h-[500px] w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                {currentVisualization && currentVisualization.data && Object.keys(currentVisualization.data).length > 0 ? (
                  <div 
                    className="w-full h-full" 
                    ref={(node) => {
                      if (node) {
                        const chart = echarts.init(node);
                        chart.setOption(getChartOption(activeTab, currentVisualization) as any);
                        chart.on('click', handleChartClick);
                        
                        // 响应窗口大小变化
                        const resizeHandler = () => {
                          chart.resize();
                        };
                        window.addEventListener('resize', resizeHandler);
                        
                        // 清理函数
                        return () => {
                          window.removeEventListener('resize', resizeHandler);
                          chart.dispose();
                        };
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-gray-500 dark:text-gray-400">该分类暂无数据</p>
                  </div>
                )}
              </div>
              
              {renderStats(currentVisualization.stats)}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-80">
              <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 员工列表对话框 */}
      <EmployeeListDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        title={dialogTitle}
        employees={dialogEmployees}
        loading={dialogLoading}
        error={dialogError}
      />
    </PageLayout>
  );
} 