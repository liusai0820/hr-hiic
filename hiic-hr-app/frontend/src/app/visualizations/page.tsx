'use client';

import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import { visualizationApi } from '@/services/api';
import ECharts from '@/components/ECharts';

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

  useEffect(() => {
    const fetchVisualizations = async () => {
      try {
        setLoading(true);
        const data = await visualizationApi.getAllVisualizations();
        setVisualizations(data);
        setError(null);
      } catch (err) {
        console.error('获取可视化数据失败:', err);
        setError('获取数据失败，请稍后再试');
      } finally {
        setLoading(false);
      }
    };

    fetchVisualizations();
  }, []);

  const tabs = [
    { id: 'department', label: '部门分布' },
    { id: 'gender', label: '性别分布' },
    { id: 'age', label: '年龄分布' },
    { id: 'education', label: '学历分布' },
    { id: 'university', label: '高校分布' },
    { id: 'work_years', label: '工作年限' },
  ];

  // 获取图表配置
  const getChartOption = (type: string, data: VisualizationData) => {
    // 这里保留原有的图表配置逻辑
    // ... 省略原有代码 ...
    
    // 根据类型返回不同的图表配置
    switch (type) {
      case 'department':
        return {
          title: {
            text: data.title,
            left: 'center'
          },
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          series: [
            {
              name: '部门人数',
              type: 'pie',
              radius: ['40%', '70%'],
              avoidLabelOverlap: false,
              itemStyle: {
                borderRadius: 10,
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: false,
                position: 'center'
              },
              emphasis: {
                label: {
                  show: true,
                  fontSize: 20,
                  fontWeight: 'bold'
                }
              },
              labelLine: {
                show: false
              },
              data: Object.entries(data.data).map(([name, value]) => ({ name, value }))
            }
          ]
        };
      
      case 'gender':
        return {
          title: {
            text: data.title,
            left: 'center'
          },
          tooltip: {
            trigger: 'item'
          },
          legend: {
            orient: 'vertical',
            left: 'left'
          },
          series: [
            {
              name: '性别分布',
              type: 'pie',
              radius: '50%',
              data: Object.entries(data.data).map(([name, value]) => ({ name, value })),
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
      
      case 'age':
        return {
          title: {
            text: data.title,
            left: 'center'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            }
          },
          xAxis: {
            type: 'category',
            data: Object.keys(data.data)
          },
          yAxis: {
            type: 'value'
          },
          series: [
            {
              data: Object.values(data.data),
              type: 'bar',
              showBackground: true,
              backgroundStyle: {
                color: 'rgba(180, 180, 180, 0.2)'
              }
            }
          ]
        };
      
      case 'education':
        return {
          title: {
            text: data.title,
            left: 'center'
          },
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          legend: {
            orient: 'vertical',
            left: 'left'
          },
          series: [
            {
              name: '学历分布',
              type: 'pie',
              radius: '50%',
              data: Object.entries(data.data).map(([name, value]) => ({ name, value })),
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
          title: {
            text: data.title,
            left: 'center'
          },
          tooltip: {
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
            type: 'value'
          },
          yAxis: {
            type: 'category',
            data: Object.keys(data.data).slice(0, 10)
          },
          series: [
            {
              name: '人数',
              type: 'bar',
              data: Object.values(data.data).slice(0, 10)
            }
          ]
        };
      
      case 'work_years':
        return {
          title: {
            text: data.title,
            left: 'center'
          },
          tooltip: {
            trigger: 'axis'
          },
          xAxis: {
            type: 'category',
            data: Object.keys(data.data)
          },
          yAxis: {
            type: 'value'
          },
          series: [
            {
              data: Object.values(data.data),
              type: 'line',
              smooth: true
            }
          ]
        };
      
      default:
        return {};
    }
  };

  // 渲染统计信息
  const renderStats = (stats?: Record<string, number>) => {
    if (!stats) return null;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="modern-card p-4 text-center">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-gray-500">{key}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <PageLayout>
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col">
        {/* 页面标题 */}
        <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white">
          <div className="content-container py-8">
            <h1 className="text-3xl font-bold">HR数据可视化</h1>
            <p className="mt-2 text-green-100">多维度展示公司人力资源数据</p>
          </div>
        </div>
        
        {/* 内容区域 */}
        <div className="content-container flex-grow">
          {/* 标签页导航 */}
          <div className="border-b border-[var(--border)] mb-6">
            <div className="flex flex-wrap -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`inline-block py-4 px-4 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600 dark:text-green-400'
                      : 'border-transparent hover:border-gray-300 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  } smooth-transition`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* 加载状态 */}
          {loading && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          )}
          
          {/* 错误信息 */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p>{error}</p>
            </div>
          )}
          
          {/* 可视化内容 */}
          {!loading && !error && visualizations[activeTab] && (
            <div>
              {/* 统计数据卡片 */}
              {renderStats(visualizations[activeTab].stats)}
              
              {/* 图表 */}
              <div className="modern-card p-4">
                <div className="h-[60vh]">
                  <ECharts option={getChartOption(activeTab, visualizations[activeTab])} />
                </div>
                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <p>{visualizations[activeTab].description}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
} 