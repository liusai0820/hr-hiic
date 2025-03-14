#!/bin/bash

# 显示彩色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}启动HIIC HR AI应用...${NC}"

# 创建日志目录
mkdir -p logs

# 启动后端
echo -e "${BLUE}启动后端服务...${NC}"
cd backend
./start.sh > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}后端服务已启动，PID: $BACKEND_PID${NC}"

# 等待后端启动
echo -e "${BLUE}等待后端服务启动...${NC}"
sleep 5

# 启动前端
echo -e "${BLUE}启动前端服务...${NC}"
cd ../frontend
./start.sh > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}前端服务已启动，PID: $FRONTEND_PID${NC}"

echo -e "${GREEN}所有服务已启动!${NC}"
echo -e "${GREEN}后端API文档: http://localhost:8000/docs${NC}"
echo -e "${GREEN}前端应用: http://localhost:3000${NC}"
echo -e "${GREEN}日志文件位于: logs/backend.log 和 logs/frontend.log${NC}"

# 改进信号处理
cleanup() {
  echo -e "${BLUE}正在停止所有服务...${NC}"
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo -e "${GREEN}所有服务已停止${NC}"
  exit 0
}

# 注册信号处理函数
trap cleanup INT TERM

# 保持脚本运行，但不使用wait命令，避免子进程退出导致脚本退出
echo -e "${BLUE}服务正在运行中，按Ctrl+C停止所有服务${NC}"
while true; do
  # 检查子进程是否存在
  if ! ps -p $BACKEND_PID > /dev/null || ! ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${BLUE}检测到服务异常退出，正在重新启动...${NC}"
    
    # 尝试杀死可能仍在运行的进程
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    
    # 重启后端
    cd "$(dirname "$0")/backend"
    ./start.sh > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo -e "${GREEN}后端服务已重启，新PID: $BACKEND_PID${NC}"
    
    # 等待后端启动
    sleep 5
    
    # 重启前端
    cd ../frontend
    ./start.sh > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo -e "${GREEN}前端服务已重启，新PID: $FRONTEND_PID${NC}"
    
    cd ..
  fi
  
  # 每5秒检查一次
  sleep 5
done 