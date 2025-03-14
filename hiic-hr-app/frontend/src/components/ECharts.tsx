'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface EChartsProps {
  option: any; // 使用any类型避免复杂的类型问题
  style?: React.CSSProperties;
  className?: string;
}

const ECharts: React.FC<EChartsProps> = ({ option, style, className }) => {
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
    }

    // 窗口大小变化时调整图表大小
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [option]);

  return (
    <div 
      ref={chartRef} 
      className={className || 'w-full h-[400px]'} 
      style={style}
    />
  );
};

export default ECharts; 