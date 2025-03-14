#!/bin/bash

# 显示彩色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}开始安装HIIC HR AI应用...${NC}"

# 检查Python
echo -e "${BLUE}检查Python版本...${NC}"
if command -v python3 &>/dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}找到Python: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}未找到Python 3，请安装Python 3.9+${NC}"
    exit 1
fi

# 检查Node.js
echo -e "${BLUE}检查Node.js版本...${NC}"
if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}找到Node.js: $NODE_VERSION${NC}"
else
    echo -e "${RED}未找到Node.js，请安装Node.js 18+${NC}"
    exit 1
fi

# 安装后端
echo -e "${BLUE}设置后端...${NC}"
cd backend

# 创建虚拟环境
echo -e "${BLUE}创建Python虚拟环境...${NC}"
python3 -m venv venv

# 激活虚拟环境
echo -e "${BLUE}激活虚拟环境...${NC}"
source venv/bin/activate

# 安装依赖
echo -e "${BLUE}安装后端依赖...${NC}"
pip install -r requirements.txt

# 检查.env文件
if [ ! -f .env ]; then
    echo -e "${BLUE}创建.env文件...${NC}"
    cp .env.example .env
    echo -e "${RED}请编辑.env文件，填入你的OpenRouter API密钥${NC}"
    echo -e "${BLUE}默认使用的模型是: google/gemini-2.0-flash-exp:free${NC}"
    echo -e "${BLUE}你可以在.env文件中修改OPENROUTER_MODEL参数来切换不同的模型${NC}"
fi

# 确保启动脚本可执行
chmod +x start.sh

# 安装前端
echo -e "${BLUE}设置前端...${NC}"
cd ../frontend

# 安装依赖
echo -e "${BLUE}安装前端依赖...${NC}"
npm install

# 检查.env.local文件
if [ ! -f .env.local ]; then
    echo -e "${BLUE}创建.env.local文件...${NC}"
    cp .env.local.example .env.local 2>/dev/null || echo -e "NEXT_PUBLIC_API_URL=http://localhost:8000/api\nNEXT_PUBLIC_APP_NAME=HIIC HR AI应用\nNEXT_PUBLIC_APP_VERSION=1.0.0" > .env.local
fi

# 确保启动脚本可执行
chmod +x start.sh

# 返回根目录
cd ..

# 确保主启动脚本可执行
chmod +x start-all.sh

echo -e "${GREEN}安装完成!${NC}"
echo -e "${GREEN}请确保你已经在backend/.env文件中设置了你的OpenRouter API密钥${NC}"
echo -e "${GREEN}使用以下命令启动应用:${NC}"
echo -e "${BLUE}./start-all.sh${NC}"
echo -e "${GREEN}或分别启动后端和前端:${NC}"
echo -e "${BLUE}cd backend && ./start.sh${NC}"
echo -e "${BLUE}cd frontend && ./start.sh${NC}" 