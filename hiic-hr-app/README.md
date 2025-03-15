# HIIC HR AI应用

基于Supabase HR数据的AI对话和数据可视化应用。

## 功能特点

- **AI对话问答**：基于HR数据回答用户问题，支持SQL查询和数据分析
- **数据可视化**：提供多种HR数据的可视化图表
- **员工数据查询**：支持按部门、ID等查询员工信息
- **统计分析**：提供各种HR数据的统计分析
- **灵活的模型选择**：通过OpenRouter支持多种大模型
- **混合聊天服务**：根据问题类型智能选择最佳回答方式

## 技术栈

### 后端
- **框架**：FastAPI, Python
- **AI**：LangChain, OpenRouter (支持多种大模型)
- **数据库**：Supabase
- **数据可视化**：Matplotlib, Seaborn
- **数据分析**：Pandas, NumPy

### 前端
- **框架**：Next.js, React
- **样式**：Tailwind CSS
- **HTTP客户端**：Axios
- **状态管理**：React Hooks

## 项目结构

```
hiic-hr-app/
├── backend/           # 后端代码
│   ├── app/           # 应用代码
│   │   ├── api/       # API路由
│   │   ├── core/      # 核心配置
│   │   ├── db/        # 数据库连接
│   │   ├── models/    # 数据模型
│   │   ├── services/  # 业务服务
│   │   └── utils/     # 工具函数
│   ├── main.py        # 主启动脚本
│   └── .env           # 环境变量
├── frontend/          # 前端代码
│   ├── src/           # 源代码
│   │   ├── app/       # 页面组件
│   │   ├── components/# 可复用组件
│   │   └── services/  # API服务
│   ├── .env.local     # 环境变量
│   └── start.sh       # 启动脚本
└── data/              # 数据文件（如有）
```

## 安装与运行

### 环境要求

- Python 3.9+
- Node.js 18+
- 有效的OpenRouter API密钥
- Supabase账号和项目

### 安装步骤

1. 克隆仓库
```bash
git clone <repository-url>
cd hiic-hr-app
```

2. 安装后端依赖
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. 配置后端环境变量
```bash
# 编辑.env文件，填入你的API密钥
OPENROUTER_API_KEY=your_openrouter_api_key
```

4. 运行后端服务
```bash
./start.sh  # 或 python main.py
```

5. 安装前端依赖
```bash
cd ../frontend
npm install
```

6. 配置前端环境变量
```bash
# 编辑.env.local文件，确保API URL正确
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

7. 运行前端服务
```bash
./start.sh  # 或 npm run dev
```

8. 访问应用
```
后端API文档: http://localhost:8000/docs
前端应用: http://localhost:3000
```

## 支持的大模型

通过OpenRouter，本应用默认使用Google的Gemini 2.0 Flash模型，但也支持以下模型：

- Google Gemini 2.0 Flash
- Anthropic Claude 3 Opus/Sonnet/Haiku
- OpenAI GPT-4/GPT-3.5
- Meta Llama 3
- Mistral Large/Medium/Small
- 以及更多OpenRouter支持的模型

可以通过修改`.env`文件中的`OPENROUTER_MODEL`参数来切换不同的模型。

## 智能问答功能

系统支持多种问答模式：

- **SQL查询**：自动将自然语言转换为SQL查询，并返回结果
- **数据分析**：使用Pandas进行数据分析，回答统计类问题
- **混合模式**：根据问题类型自动选择最佳回答方式
- **上下文记忆**：支持多轮对话，保持上下文连贯性

## API接口

- **GET /api/** - API根路径
- **POST /api/chat** - 聊天接口
- **GET /api/employees** - 获取所有员工
- **GET /api/employees/{id}** - 获取特定员工
- **GET /api/departments/{department}/employees** - 获取部门员工
- **GET /api/stats** - 获取统计数据
- **GET /api/visualizations** - 获取所有可视化图表
- **GET /api/visualizations/{type}** - 获取特定类型的可视化

## 前端页面

- **/** - 首页
- **/chat** - AI对话页面
- **/visualizations** - 数据可视化页面
- **/employees** - 员工列表页面
- **/employees/{id}** - 员工详情页面

## 开发进度

- [x] 后端API开发
- [x] 数据库连接
- [x] AI聊天服务
- [x] OpenRouter集成
- [x] 数据可视化服务
- [x] 前端页面框架
- [x] 前端API服务
- [x] 聊天界面
- [x] 可视化界面
- [x] 员工数据界面
- [x] 问题分类器
- [x] SQL查询功能
- [x] 数据分析功能
- [ ] 用户认证
- [ ] 部署配置

## 后续开发计划

- 用户认证和权限管理
- 更高级的AI分析功能
- 人才画像功能
- 人才筛选功能
- 移动端适配优化
- 多语言支持
- 更多数据可视化图表

## 许可证

[MIT](LICENSE) 