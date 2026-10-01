# X Markdown

一个 Chrome 插件：把当前网页一键转成 Markdown，复制到剪贴板或下载成 `.md` 文件。

主要为 X（Twitter）设计：

- **推文**：只取当前打开的这一条，带作者、发布时间、原图和引用推文，不带评论区和别人的回复
- **长文（X Articles）**：标题、小标题、列表、引用、代码块、加粗斜体、链接、图片都会保留结构
- **其他网页**：用 Mozilla Readability 提取正文后再转换

## 安装

还没有上架 Chrome 应用商店，需要手动加载：

1. 下载本仓库（`git clone` 或在 GitHub 页面点 Code → Download ZIP 后解压）
2. 打开 `chrome://extensions`，打开右上角「开发者模式」
3. 点「加载未打包的扩展程序」，选择仓库目录

不需要 `npm install`，插件没有构建步骤，用到的两个库已经放在 `vendor/` 里。

## 使用

两种方式，效果一样：

- 点工具栏的插件图标，在弹窗里点「复制 Markdown」或「下载 .md」
- 在页面上右键，选「复制为 Markdown」或「下载为 Markdown」，成功时插件图标上会闪一下 ✓，失败闪 ✗

输出示例（推文）：

```markdown
---
title: "Nick St. Pierre: 1960s street style photo of a young woman, sitting"
author: "Nick St. Pierre (@nickfloats)"
url: "https://x.com/nickfloats/status/1636116996164304896"
published: "2023-03-15T21:27:44.000Z"
---

1960s street style photo of a young woman, sitting, sailboat, ...

![](https://pbs.twimg.com/media/FrSnufhaEAAlWh6?format=jpg&name=orig)
```

开头的 front matter 方便直接放进 Obsidian 等笔记软件；下载的文件名取自标题。

## 权限说明

只申请了必要的权限，不能在后台读取你浏览的页面：

| 权限 | 用途 |
|---|---|
| `activeTab` | 只在你点击插件图标或右键菜单时，临时访问当前标签页 |
| `scripting` | 把转换脚本注入当前页面 |
| `contextMenus` | 右键菜单 |
| `downloads` | 下载 `.md` 文件 |
| `clipboardWrite` | 写入剪贴板 |

所有转换都在本地完成，不会把页面内容发到任何服务器。

## 已知限制

- 页面还没加载完时会提示「未找到当前推文/长文正文，请等待页面加载完成后重试」
- 只提取页面上已经渲染出来的内容；长文里还没加载出来的图片会输出成指向 X 图片页的链接
- 不支持 thread 串推，只取当前这一条
- 推文里的视频不会下载，输出为指向原推文的链接
- `chrome://` 页面和 Chrome 应用商店页面不允许插件注入脚本，会提示失败

## 开发

```bash
npm install
npm test          # node 自带的测试框架 + jsdom
npm run vendor    # 升级依赖后，把浏览器可用的构建拷进 vendor/
```

- `src/extract.js`：转换逻辑，X 推文、X 长文、通用网页三条路径
- `src/page-action.js`：注入脚本、复制、下载
- `src/background.js`：右键菜单
- `popup/`：工具栏弹窗
- `icons/`：插件图标（`icon.svg` 为源文件）
- `tests/fixtures/`：从真实 X 页面裁剪出来的测试样本

## 致谢

- [Turndown](https://github.com/mixmark-io/turndown)（MIT）：HTML 转 Markdown
- [Readability](https://github.com/mozilla/readability)（Apache-2.0）：网页正文提取

## License

MIT
