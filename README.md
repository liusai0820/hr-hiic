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

## 最近更新

### UI与用户体验优化 (2023-07-22)

- 用户界面优化：
  - 优化了页面底部统计区域，减少了垂直空间占用，使其更像标准页脚
  - 为统计数据添加了点击交互功能，点击不同统计数字可跳转至相应的可视化页面
  - 修改了可视化页面，支持通过URL参数设置活动标签，实现更好的页面间导航
  - 优化了生日员工对话框，移除了祝福消息部分，减小了员工卡片尺寸，以在屏幕上显示更多员工信息
  - 修复了员工生日对话框中年龄和入职日期显示不正确的问题

- 性别样式区分与数据处理优化：
  - 在员工详情页面实现了基于性别的样式区分：
    - 女性员工使用粉色系样式和女性头像图标
    - 男性员工使用蓝色系样式和男性头像图标
    - 职位标签根据性别显示不同的背景色和文字颜色
  - 实现了应用启动时的数据缓存机制，避免重复请求Supabase数据库
  - 修复了部门数量和平均年龄显示为零的问题，优化了统计数据的计算逻辑
  - 增强了字段映射功能，支持中英文字段名的智能匹配，提高了数据显示的准确性
  - 优化了入职年限计算，确保正确显示员工的服务年限

### 教育统计指标优化与职业发展信息显示改进 (2025-03-17)

- 教育统计指标优化：
  - 移除了"专科及以下比例"指标，不再显示在统计数据中
  - 新增"硕士及以上比例"指标，展示高学历人才占比
  - 新增"海外学历占比"指标，统计具有海外教育背景的员工比例
  - 新增"985/211院校占比"指标，统计毕业于国内重点高校的员工比例
  - 优化了"学历结构评分"的计算逻辑和解释说明，使其更加清晰
  - 前后端同步修改，确保数据一致性

- 职业发展信息显示优化：
  - 改进了职业发展信息的解析和显示逻辑
  - 优化了年份提取算法，支持多种格式（如"2020年"、"2020-"等）
  - 改进了时间线显示，更清晰地展示职业发展历程
  - 修复了显示异常字符（如"年"和"，"）的问题
  - 增强了文本清理功能，提供更整洁的信息展示

- 技术改进：
  - 优化了前后端数据处理逻辑，提高了应用性能
  - 改进了数据可视化组件的渲染逻辑，确保零值不显示
  - 增强了类型检查，修复了潜在的类型错误
  - 优化了条件渲染逻辑，提高了用户界面的响应性

### 数据可视化功能修复 (2023-03-16)

- 修复了数据可视化页面的多个问题：
  - 修复了API路由冲突问题，确保特定路由优先匹配
  - 优化了索引创建逻辑，动态检测表结构并创建适当的索引
  - 修复了可视化服务中的数据获取逻辑，支持从多个数据源获取信息
  - 增强了前端与后端的交互，修复了点击图表无法显示详细员工列表的问题
  - 添加了必要的前端依赖（Material UI、Framer Motion）以支持交互功能
  - 更新了SQL服务中的表关系描述，确保准确反映实际数据结构

- 技术改进：
  - 优化了后端路由配置，解决了路由冲突问题
  - 改进了数据库模式检测，自动适应不同的数据结构
  - 增强了错误处理和日志记录，便于调试和问题排查
  - 优化了前端组件的加载和渲染逻辑

## 后续开发计划

- 用户认证和权限管理
- 更高级的AI分析功能
- 人才画像功能
- 人才筛选功能
- 移动端适配优化
- 多语言支持
- 更多数据可视化图表
- 数据导出功能
- 报表生成功能

## 许可证

[MIT](LICENSE) 