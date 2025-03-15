#!/bin/bash

# 激活虚拟环境
source venv/bin/activate

# 安装依赖（如果需要）
pip install -r requirements.txt

# 启动后端服务
cd "$(dirname "$0")"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload 