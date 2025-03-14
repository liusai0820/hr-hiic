'use client';

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import PageLayout from "@/components/PageLayout";
import { useEffect, useState } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [forceRender, setForceRender] = useState(false);
  
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
    <PageLayout showFooter={true}>
      <div className="w-full min-h-[calc(100vh-var(--header-height)-var(--footer-height))] flex flex-col">
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
                  <Link href="/employees" className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-medium shadow-lg smooth-transition">
                    查看员工数据
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            
            <div className="modern-card p-6">
              <div className="bg-green-100 dark:bg-green-900 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">数据可视化</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                查看部门、性别、年龄等多维度的HR数据可视化图表。
              </p>
              {user || forceRender ? (
                <Link href="/visualizations" className="text-green-600 hover:text-green-700 font-medium flex items-center">
                  查看图表
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
            
            <div className="modern-card p-6">
              <div className="bg-purple-100 dark:bg-purple-900 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">员工数据</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                浏览和搜索员工信息，按部门、职位等筛选查看。
              </p>
              {user || forceRender ? (
                <Link href="/employees" className="text-purple-600 hover:text-purple-700 font-medium flex items-center">
                  查看员工
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              ) : (
                <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium flex items-center">
                  登录使用
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
