import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Card, CardContent, Box } from '@mui/material';

const BarChart = ({ title, description, xAxis, yAxis, data, onClick }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // 如果已经有图表实例，销毁它
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    // 创建新的图表实例
    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    // 图表配置
    const option = {
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
        type: 'category',
        data: xAxis || [],
        axisTick: {
          alignWithLabel: true
        }
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: title,
          type: 'bar',
          barWidth: '60%',
          data: yAxis || [],
          itemStyle: {
            color: '#61a0a8'
          }
        }
      ]
    };

    // 设置图表配置
    chart.setOption(option);

    // 添加点击事件监听器
    if (onClick) {
      chart.on('click', (params) => {
        // 调用传入的onClick回调，传递点击的类别名称
        onClick(params.name);
      });
    }

    // 响应窗口大小变化
    const handleResize = () => {
      chart.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [title, xAxis, yAxis, onClick]);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box ref={chartRef} sx={{ width: '100%', height: 300 }} />
      </CardContent>
    </Card>
  );
};

export default BarChart; 