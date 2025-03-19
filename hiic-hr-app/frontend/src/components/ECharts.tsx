'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface EChartsProps {
  option: any; // 使用any类型避免复杂的类型问题
  style?: React.CSSProperties;
  className?: string;
  onEvents?: Record<string, Function>; // 添加事件处理
}

const ECharts: React.FC<EChartsProps> = ({ option, style, className, onEvents }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    // 初始化图表
    if (chartRef.current) {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }
      
      // 设置图表选项
      chartInstance.current.setOption(option, true);
      
      // 添加事件处理
      if (onEvents && chartInstance.current) {
        Object.keys(onEvents).forEach(eventName => {
          chartInstance.current?.off(eventName);
          chartInstance.current?.on(eventName, onEvents[eventName]);
        });
      }
    }

    // 窗口大小变化时调整图表大小
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      
      // 移除事件监听
      if (onEvents && chartInstance.current) {
        Object.keys(onEvents).forEach(eventName => {
          chartInstance.current?.off(eventName);
        });
      }
      
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [option, onEvents]);

  return (
    <div 
      ref={chartRef} 
      className={className || 'w-full h-[400px]'} 
      style={style}
    />
  );
};

export default ECharts; 