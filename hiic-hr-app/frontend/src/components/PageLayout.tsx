import React from 'react';
import Navbar from './Navbar';

interface PageLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

export default function PageLayout({ children, showFooter = false }: PageLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <Navbar />
      <main className={`flex-grow w-full pt-[var(--header-height)] ${!showFooter ? 'pb-0' : ''}`}>
        {children}
      </main>
      {showFooter && (
        <footer className="bg-[var(--card)] border-t border-[var(--border)] py-6 w-full">
          <div className="w-full px-4 md:px-8 lg:px-12">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <p className="text-sm text-gray-500 dark:text-gray-400">© 2025 HR小助手. 保留所有权利.</p>
              </div>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white smooth-transition">
                  <span className="sr-only">关于我们</span>
                  关于
                </a>
                <a href="#" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white smooth-transition">
                  <span className="sr-only">隐私政策</span>
                  隐私政策
                </a>
                <a href="#" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white smooth-transition">
                  <span className="sr-only">联系我们</span>
                  联系我们
                </a>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
} 