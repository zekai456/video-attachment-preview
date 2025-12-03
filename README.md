# 视频附件预览插件

飞书多维表格视频附件预览插件，支持视频播放、图片查看等功能。

## 功能特性

- 📹 视频播放（播放/暂停、进度条、音量控制）
- 🖼️ 图片查看（缩放、旋转）
- 📎 多附件切换（底部缩略图列表）
- 📄 翻页导航（切换不同记录）
- ⬇️ 下载功能

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 部署到 GitHub Pages

1. 创建 GitHub 仓库
2. 修改 `vite.config.ts` 中的 `repoName` 为你的仓库名
3. 推送代码到 `main` 分支
4. 在仓库 Settings → Pages 中选择 "GitHub Actions" 作为 Source
5. 等待 Actions 完成部署

部署完成后，访问地址为：`https://你的用户名.github.io/仓库名/`

## 在飞书中使用

1. 打开飞书开放平台
2. 创建多维表格插件
3. 填入 GitHub Pages 地址作为插件 URL
4. 保存并使用

## 技术栈

- React 18
- TypeScript
- TailwindCSS
- Vite
- @lark-base-open/js-sdk
