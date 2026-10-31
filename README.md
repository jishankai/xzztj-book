# 新续资治通鉴

清·毕沅 原著，季善凯 重编。

以“资治”为取舍准绳，据《续资治通鉴》裁繁就要，供阅读与交流。

## 目录

- `index.html`：GitHub Pages 首页，无构建依赖。
- `assets/style.css`：响应式样式，无外部字体、统计或第三方脚本。
- `assets/app.js`：原生 JavaScript 阅读器、目录检索与本地阅读记录，无第三方依赖。
- `assets/catalog.json`：从分卷原文提取的帝号、年号与卷号索引，随站点直接发布。
- `scripts/build_catalog.py`：可选的目录数据维护脚本，仅使用 Python 标准库。
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

## 在线阅读

- 首页可打开 110 卷重编全书；分卷目录提供按原书卷界组织的 220 份文本，两者卷号不一一对应。
- 目录支持按卷号、帝号、年号及卷号范围筛选。年代信息取自每份文本的首个 `○` 或 `◎` 标题，不补写原文没有的帝号。
- 阅读器支持章节／年份跳转、当前正文查找与匹配定位、上一卷／下一卷、字号调整和纸色／夜读主题。正文查找仅针对当前打开的全书或分卷，不是跨文件检索。
- 阅读进度、字号和主题保存在当前浏览器的 `localStorage`，不上传服务器；首页“继续阅读”可恢复最后打开的文本与位置。清理浏览器数据会删除记录，不支持跨设备同步。
- 阅读链接支持 `#read/001`–`#read/220` 和 `#read/full`，可以收藏或分享；浏览器返回键、关闭按钮及 Escape 均可退出阅读。
- 禁用 JavaScript 时，目录及下载链接仍可直接打开原始文件。加载失败时可重试，或打开“原始 TXT”。请通过上述 HTTP 服务预览，不要直接双击 HTML 使用 `file://`。

## 手动验收

没有配置构建、自动化测试或 lint。修改后通过本地 HTTP 预览检查：

1. 目录卷号／年号检索、范围筛选、无结果提示及重置。
2. 全书与首／中／末卷阅读、正文查找高亮及前后定位、章节跳转、换卷边界。
3. 调整字号与主题，滚动正文，关闭或刷新后继续阅读；检查深链接、返回键和 Escape。
4. 桌面与手机布局、键盘焦点、减少动态效果偏好，以及 TXT 和两种 PDF 的实际链接。
5. 网络加载失败的重试／原文入口、本地存储不可用时的提示，以及项目子目录下的相对路径。

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

修改 `txt/volumes/` 后，重新生成并一同提交目录数据：

```sh
python3 scripts/build_catalog.py
```

脚本以自身路径定位项目根目录；从其他目录调用时，请使用脚本的绝对路径。它生成包含全部 220 卷的 `assets/catalog.json`，不是部署前必须执行的构建。脚本保留原文标题与用字，不生成 PDF，也不改写正文。若调整分卷文件数量或命名，还须同步修改首页静态目录及阅读器卷号边界。

## 权利说明与勘误

原著：清·毕沅。重编：季善凯。本仓库未另行授予开放许可；公开阅读不等于允许任意转载或再发行。对重编内容的授权由权利人另行决定。

发现文字、史实或排版问题，可通过 GitHub Issues 提交，注明文件名、卷号与相关原文。
