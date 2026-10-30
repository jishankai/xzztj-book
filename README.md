# 新续资治通鉴

清·毕沅 原著，季善凯 重编。

以“资治”为取舍准绳，据《续资治通鉴》裁繁就要，供阅读与交流。

## 目录

- `index.html`：GitHub Pages 首页，无构建依赖。
- `assets/style.css`：响应式样式，无外部字体、统计或第三方脚本。
- `txt/新续资治通鉴.txt`：重编全书（110 卷），含序、凡例及脚注。
- `txt/volumes/001.txt`–`220.txt`：按原书 220 卷卷界组织的文本，与重编 110 卷卷号不一一对应。
- `pdf/`：2026-10-28 编辑审核稿，含横排和右起竖排版本。
- `.nojekyll`：直接发布静态文件。

TXT 采用 UTF-8。PDF 本次按原文件复制，未重新排版；其中内容及字数脚注可能与最新 TXT 不同。请按版本需要选择。

## 本地预览

在项目根目录运行：

```sh
python3 -m http.server 8000
```

打开 http://localhost:8000 。

## 发布到 GitHub

1. 在 GitHub 创建空仓库，建议仓库名 `xzztj-book`，不要额外初始化 README。
2. 在本地项目根目录关联该仓库（将下方地址替换为自己的真实仓库地址）：

```sh
git add .
git commit -m "Publish Xin Xu Zizhi Tongjian texts and PDFs"
git remote add origin https://github.com/YOUR_USERNAME/xzztj-book.git
git push -u origin main
```

3. 打开仓库 **Settings → Pages → Build and deployment**。
4. Source 选择 **Deploy from a branch**，分支选择 **main**，目录选择 **/(root)**，保存。
5. 等待部署完成，访问 GitHub Pages 设置页显示的地址，通常为 `https://YOUR_USERNAME.github.io/xzztj-book/`。

所有页面资源与下载链接均使用相对路径，可直接部署在项目站点子目录。不需要建立 `gh-pages` 分支，也不需要 Node.js 或 GitHub Actions。

## 更新内容

替换对应 TXT/PDF 后执行 `git add .`、`git commit`、`git push`；Pages 会按分支重新发布。PDF 若更改文件名，请同步修改 `index.html` 中的链接与版本说明。

## 权利说明与勘误

原著：清·毕沅。重编：季善凯。本仓库未另行授予开放许可；公开阅读不等于允许任意转载或再发行。对重编内容的授权由权利人另行决定。

发现文字、史实或排版问题，可通过 GitHub Issues 提交，注明文件名、卷号与相关原文。
