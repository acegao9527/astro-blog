# 博客部署方案

## 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        数据源 (MWeb)                             │
│  /Users/acelee/Library/Mobile Documents/iCloud~com~coderforart~ │
│  iOS~MWeb/Documents/blog/*.md                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ---                                                     │    │
│  │ id: xxx                                                │    │
│  │ title: 文章标题                                         │    │
│  │ created: 2026-01-01T00:00:00Z                         │    │
│  │ tags: tag1, tag2                                       │    │
│  │ ---                                                     │    │
│  │                                                         │    │
│  │ # 正文内容...                                           │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Astro 构建 (本地)                              │
│                                                                 │
│   npm run build                                                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ src/utils/posts.ts                                      │   │
│   │   - 读取 MWeb 目录下的 .md 文件                         │   │
│   │   - 解析 frontmatter (title, date, tags)                │   │
│   │   - 按日期排序                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ src/pages/                                              │   │
│   │   - index.astro (首页列表)                              │   │
│   │   - post/[id].astro (文章详情)                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│                        ./dist/                                  │
│                  (静态 HTML 文件)                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  远程服务器 (SSH)                                 │
│                                                                 │
│   rsync -avz --delete -e ssh dist/ ta:/root/nginx/html/        │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ /root/nginx/html/                                       │   │
│   │   ├── index.html                                       │   │
│   │   ├── post/                                            │   │
│   │   │   ├── article-1/index.html                         │   │
│   │   │   ├── article-2/index.html                         │   │
│   │   │   └── ...                                          │   │
│   │   └── _astro/ (静态资源)                                │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                        ▼ Nginx serve                           │
│                     https://your-blog.com                      │
└─────────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. 数据源：MWeb

- **位置**: `~/Library/Mobile Documents/iCloud~com~coderforart~iOS~MWeb/Documents/blog/`
- **格式**: Markdown 文件 (.md)
- **Frontmatter**:
  ```yaml
  ---
  id: UUID (可选)
  title: 文章标题
  created: 创建时间 (ISO 8601)
  modified: 修改时间 (ISO 8601)
  tags: 标签1, 标签2
  ---
  ```

### 2. 构建工具：Astro

- **项目结构**:
  ```
  src/
  ├── utils/
  │   └── posts.ts      # 读取和解析 markdown 文件
  ├── pages/
  │   ├── index.astro   # 首页：文章列表
  │   └── post/
  │       └── [id].astro # 详情页：渲染 markdown 内容
  ```

- **核心逻辑**:
  - `posts.ts`: 使用 `fs` 模块读取 MWeb 目录，解析 frontmatter
  - `index.astro`: 调用 `getPosts()` 获取文章列表，按日期排序
  - `[id].astro`: 使用 `marked` 将 markdown 转为 HTML

### 3. 部署：rsync + SSH

- **命令**: `npm run deploy`
- **原理**: 通过 rsync 将 `dist/` 目录同步到远程服务器
- **参数说明**:
  - `-a`: 归档模式（保留权限、时间戳等）
  - `-v`: 显示详细信息
  - `-z`: 压缩传输
  - `--delete`: 删除目标目录中源目录没有的文件
  - `-e ssh`: 使用 SSH 传输

## 工作流程

### 开发流程

```bash
# 1. 启动开发服务器
npm run dev
# 访问 http://localhost:4321

# 2. 编辑 MWeb 中的博客文章
# 文件会自动同步到 iCloud

# 3. 刷新浏览器查看更改
```

### 部署流程

```bash
# 1. 构建生产版本
npm run build
# 输出到 ./dist/

# 2. 部署到服务器
npm run deploy
# 等同于: rsync -avz --delete -e ssh dist/ ta:/root/nginx/html/
```

### 完整示例

```bash
# 修改博客文章（在 MWeb 中）
# -> 文件保存到 iCloud

# 本地构建
npm run build
# => generating static routes
#    ├─ /index.html
#    ├─ /post/article-1/index.html
#    └─ ...

# 部署上线
npm run deploy
# => building...
#    sent XXX bytes  received XXX bytes
#    rsync warning: some files vanished before they were transferred
```

## 配置说明

### 环境配置

- **Node 版本**: >= 22.12.0
- **依赖**:
  - `astro`: ^6.0.4
  - `marked`: ^17.0.5

### 路径配置

博客源文件路径在 `src/utils/posts.ts` 中定义：

```typescript
const BLOG_DIR = '/Users/acelee/Library/Mobile Documents/iCloud~com~coderforart~iOS~MWeb/Documents/blog';
```

如需修改博客目录，编辑此常量即可。

### 部署配置

SSH 别名 `ta` 需在 `~/.ssh/config` 中配置：

```ssh
Host ta
    HostName your-server-ip
    User root
    IdentityFile ~/.ssh/your-key
    Port 22
```

## 注意事项

1. **iCloud 同步**: 确保 MWeb 中的博客目录已开启 iCloud 同步
2. **SSH 密钥**: 部署前需配置 SSH 免密登录
3. **构建时机**: 每次部署前需先运行 `npm run build`
4. **静态资源**: 图片等静态资源建议放在 `public/` 目录或使用图床
