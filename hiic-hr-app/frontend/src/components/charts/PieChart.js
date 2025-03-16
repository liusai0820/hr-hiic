import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Card, CardContent, Box } from '@mui/material';

const PieChart = ({ title, description, labels, values, data, onClick }) => {
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

    // 准备数据
    const chartData = labels && values ? 
      labels.map((label, index) => ({ value: values[index], name: label })) : 
      Object.entries(data || {}).map(([name, value]) => ({ name, value }));

    // 图表配置
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        data: chartData.map(item => item.name)
      },
      series: [
        {
          name: title,
          type: 'pie',
          radius: ['50%', '70%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: chartData
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
  }, [title, labels, values, data, onClick]);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box ref={chartRef} sx={{ width: '100%', height: 300 }} />
      </CardContent>
    </Card>
  );
};

export default PieChart; 