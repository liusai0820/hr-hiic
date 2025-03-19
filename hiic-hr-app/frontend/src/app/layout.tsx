import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "HIIC HR AI应用",
  description: "基于Supabase HR数据的AI对话和数据可视化应用",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            // 紧急修复 - 检测并解决无限加载状态
            (function() {
              // 如果页面加载超过5秒仍处于加载状态，尝试强制刷新
              const LOADING_TIMEOUT = 5000; // 5秒
              
              // 检查是否有加载状态指示器
              setTimeout(function() {
                const loadingIndicators = document.querySelectorAll('.animate-spin');
                if (loadingIndicators.length > 0) {
                  console.log('检测到页面可能处于无限加载状态，尝试恢复...');
                  
                  // 尝试重置加载状态
                  try {
                    // 检查是否在登录页面
                    if (window.location.pathname === '/login') {
                      console.log('在登录页面检测到无限加载，尝试重置状态');
                      // 强制刷新页面
                      window.location.reload();
                    } else {
                      // 检查是否已登录
                      const authData = localStorage.getItem('hiic-hr-auth');
                      if (authData) {
                        console.log('检测到用户已登录但页面仍在加载，尝试重定向');
                        // 如果已登录但页面仍在加载，尝试重定向到首页
                        window.location.replace('/');
                      } else {
                        console.log('未检测到登录信息，重定向到登录页');
                        window.location.replace('/login');
                      }
                    }
                  } catch (e) {
                    console.error('恢复加载状态时出错:', e);
                    // 出错时强制刷新
                    window.location.reload();
                  }
                }
              }, LOADING_TIMEOUT);
            })();
            
            // 网络状态监控和错误处理
            (function() {
              // 存储关键请求状态
              window.networkInfo = {
                lastRequestTime: Date.now(),
                failedRequests: 0,
                totalRequests: 0,
                isOnline: navigator.onLine,
                requestInProgress: false,
                longRequestActive: false,
                showingNetworkError: false
              };
              
              // 监听网络状态变化
              window.addEventListener('online', function() {
                console.log('网络已恢复连接');
                window.networkInfo.isOnline = true;
                if (window.networkInfo.showingNetworkError) {
                  showNetworkStatus('网络已恢复连接', 'success');
                  window.networkInfo.showingNetworkError = false;
                }
              });
              
              window.addEventListener('offline', function() {
                console.log('网络连接已断开');
                window.networkInfo.isOnline = false;
                showNetworkStatus('网络连接已断开，请检查您的互联网连接', 'error');
                window.networkInfo.showingNetworkError = true;
              });
              
              // 自动重试超时请求
              const MAX_RETRY_COUNT = 2;
              const RETRY_DELAY = 2000; // 2秒
              
              // 创建通知元素
              function showNetworkStatus(message, type) {
                let statusElement = document.getElementById('network-status-message');
                if (!statusElement) {
                  statusElement = document.createElement('div');
                  statusElement.id = 'network-status-message';
                  statusElement.style.position = 'fixed';
                  statusElement.style.top = '10px';
                  statusElement.style.left = '50%';
                  statusElement.style.transform = 'translateX(-50%)';
                  statusElement.style.padding = '10px 20px';
                  statusElement.style.borderRadius = '4px';
                  statusElement.style.zIndex = '9999';
                  statusElement.style.fontFamily = 'sans-serif';
                  statusElement.style.fontSize = '14px';
                  statusElement.style.transition = 'opacity 0.5s';
                  document.body.appendChild(statusElement);
                }
                
                statusElement.textContent = message;
                statusElement.style.opacity = '1';
                
                if (type === 'error') {
                  statusElement.style.backgroundColor = '#f44336';
                  statusElement.style.color = 'white';
                } else if (type === 'warning') {
                  statusElement.style.backgroundColor = '#ff9800';
                  statusElement.style.color = 'white';
                } else if (type === 'success') {
                  statusElement.style.backgroundColor = '#4caf50';
                  statusElement.style.color = 'white';
                }
                
                // 如果不是错误消息，自动隐藏
                if (type !== 'error') {
                  setTimeout(() => {
                    statusElement.style.opacity = '0';
                    setTimeout(() => {
                      if (statusElement && statusElement.parentNode) {
                        statusElement.parentNode.removeChild(statusElement);
                      }
                    }, 500);
                  }, 3000);
                }
              }
              
              // 拦截XHR以处理超时
              const originalXHROpen = window.XMLHttpRequest.prototype.open;
              const originalXHRSend = window.XMLHttpRequest.prototype.send;
              
              window.XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
                this._url = url;
                this._method = method;
                this._retryCount = 0;
                return originalXHROpen.apply(this, arguments);
              };
              
              window.XMLHttpRequest.prototype.send = function(data) {
                this._data = data;
                
                const originalOnReadyStateChange = this.onreadystatechange;
                const xhr = this;
                
                window.networkInfo.totalRequests++;
                window.networkInfo.requestInProgress = true;
                window.networkInfo.lastRequestTime = Date.now();
                
                // 标记长时间请求
                const longRequestTimeout = setTimeout(() => {
                  window.networkInfo.longRequestActive = true;
                }, 10000); // 10秒认为是长请求
                
                this.onreadystatechange = function() {
                  if (xhr.readyState === 4) {
                    clearTimeout(longRequestTimeout);
                    window.networkInfo.requestInProgress = false;
                    window.networkInfo.longRequestActive = false;
                    
                    // 处理超时或错误
                    if (xhr.status === 0 || xhr.status >= 500) {
                      window.networkInfo.failedRequests++;
                      
                      // 如果未超过最大重试次数，尝试重试
                      if (xhr._retryCount < MAX_RETRY_COUNT && window.networkInfo.isOnline) {
                        xhr._retryCount++;
                        console.log(\`请求失败，正在尝试第\${xhr._retryCount}次重试\`);
                        
                        if (xhr._retryCount === 1) {
                          showNetworkStatus('网络请求失败，正在重试...', 'warning');
                        }
                        
                        setTimeout(() => {
                          const newXhr = new XMLHttpRequest();
                          newXhr.open(xhr._method, xhr._url, true);
                          
                          // 复制原始请求的头部
                          if (xhr.getAllResponseHeaders()) {
                            xhr.getAllResponseHeaders().split('\\r\\n').forEach(header => {
                              if (header) {
                                const parts = header.split(': ');
                                if (parts.length === 2) {
                                  newXhr.setRequestHeader(parts[0], parts[1]);
                                }
                              }
                            });
                          }
                          
                          // 设置相同的事件处理程序
                          newXhr.onreadystatechange = originalOnReadyStateChange;
                          newXhr._retryCount = xhr._retryCount;
                          newXhr.send(xhr._data);
                        }, RETRY_DELAY);
                        
                        return;
                      } else if (xhr._retryCount >= MAX_RETRY_COUNT) {
                        showNetworkStatus('网络连接不稳定，请检查您的互联网连接', 'error');
                        window.networkInfo.showingNetworkError = true;
                      }
                    } else if (xhr.status >= 200 && xhr.status < 300) {
                      // 请求成功，重置失败计数
                      window.networkInfo.failedRequests = 0;
                      if (window.networkInfo.showingNetworkError) {
                        showNetworkStatus('网络连接已恢复', 'success');
                        window.networkInfo.showingNetworkError = false;
                      }
                    }
                  }
                  
                  if (originalOnReadyStateChange) {
                    originalOnReadyStateChange.apply(this, arguments);
                  }
                };
                
                return originalXHRSend.apply(this, arguments);
              };
            })();
            
            // 禁用控制台错误，防止扩展错误干扰应用
            const originalConsoleError = console.error;
            console.error = function(...args) {
              // 过滤掉Chrome扩展相关的错误
              if (args[0] && typeof args[0] === 'string' && 
                  (args[0].includes('chrome-extension') || 
                   args[0].includes('net::ERR_FILE_NOT_FOUND'))) {
                return; // 忽略扩展相关错误
              }
              originalConsoleError.apply(console, args);
            };
            
            // 全局错误处理
            window.addEventListener('error', function(event) {
              // 阻止扩展资源加载错误冒泡
              if (event.target && 
                  (event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK') &&
                  (event.target.src && event.target.src.includes('chrome-extension') ||
                   event.target.href && event.target.href.includes('chrome-extension'))) {
                event.preventDefault();
                event.stopPropagation();
                return false;
              }
            }, true);
            
            // 确保localStorage可用
            try {
              localStorage.setItem('test', 'test');
              localStorage.removeItem('test');
              console.log('localStorage 可用');
              
              // 调试当前存储的认证信息
              const authKeys = [
                'hiic-hr-auth',
                'supabase.auth.token'
              ];
              
              authKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) {
                  try {
                    const parsed = JSON.parse(value);
                    console.log('存储的认证信息 ' + key + ':', {
                      user_id: parsed.user?.id || '未知',
                      email: parsed.user?.email || '未知',
                      expires_at: parsed.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : '未知'
                    });
                  } catch (e) {
                    console.log('存储的认证信息 ' + key + ':', value.substring(0, 50) + '...');
                  }
                } else {
                  console.log('未找到存储的认证信息:', key);
                }
              });
              
              // 检查当前页面路径
              console.log('当前页面路径:', window.location.pathname);
              console.log('当前页面查询参数:', window.location.search);
              
            } catch (e) {
              console.error('localStorage 不可用:', e);
            }
          `
        }} />
      </head>
      <body className={GeistSans.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
