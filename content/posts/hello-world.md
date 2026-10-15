---
title: "如何快速构建一个静态博客?"
date: 2026-10-14T11:44:43+08:00
draft: false
tags: ["博客搭建"]
categories: ["博客"]
---

> 关键问题：如何快速、省心地搭建一个静态博客？

## 1. 为什么写博客？

写技术博客最重要的意义，不只是记录自己学过什么，而是将知识转化为能够被验证、复用和分享的成果。

- **检验理解程度。** 能够把一个技术问题讲清楚，往往意味着自己已经建立了较为完整的知识体系。
- **建立个人知识库。** 将零散的学习笔记整理成结构化、可持续积累的技术资料。
- **推动实践。** 通过总结项目中的问题与解决方案，促使自己真正动手实现，而不是停留在理论层面。
- **促进知识共享。** 让自己的思考和实践成果能够被他人阅读、检验和复用。
- **展示技术能力。** 一篇有深度的技术文章，往往比简单罗列技术栈更能体现一个人的理解与实践能力。

## 2. 快速搭建一个静态博客

### 2.1 方案选择

搭建静态博客有很多种方案。本文介绍的是 **Hugo + GitHub Pages**，它们分别负责网站生成和静态页面托管。

这套方案具有以下特点：

- **轻量易维护：** 不需要数据库、后端服务或复杂的运行环境。
- **写作体验简单：** 使用 Markdown 编写文章，无须手动编写 HTML。
- **构建速度快：** Hugo 可以将 Markdown、主题模板和配置文件生成静态 HTML 页面。
- **部署成本低：** GitHub Pages 可以免费托管符合条件的公开静态网站。
- **便于版本管理：** 文章、配置和代码都可以通过 Git 管理。

整体工作流如下：

```text
编写 Markdown
      ↓
Hugo 构建静态网站
      ↓
GitHub Actions 自动部署
      ↓
GitHub Pages 发布网站
```

完成初始化后，日常写作只需要编辑 Markdown 文件并推送到 GitHub，剩余的构建与部署工作就可以交给 GitHub Actions 自动完成。

### 2.2 创建博客

#### 第一步：安装 Hugo

Hugo 是一个使用 Go 编写的静态网站生成器。本文以 macOS 为例，使用 Homebrew 安装：

```bash
brew install hugo
hugo version
```

如果输出版本信息，说明安装成功。Windows 和 Linux 用户可以参考 Hugo 官方文档中的安装说明。

#### 第二步：初始化项目

执行以下命令，创建博客项目：

```bash
hugo new site my-blog
cd my-blog
git init
```

其中，`my-blog` 是项目目录名称，可以根据自己的习惯修改。

#### 第三步：添加 PaperMod 主题

为了减少样式和页面布局方面的工作，本文使用 PaperMod 主题。它具有简洁的界面，并提供文章列表、标签、分类、归档等常用功能。

执行：

```bash
git submodule add \
  https://github.com/adityatelange/hugo-PaperMod.git \
  themes/PaperMod
```

这里使用 Git Submodule 管理主题，既可以将主题与博客项目分开维护，也方便后续更新。

接下来，在项目根目录的 `hugo.toml` 中设置基本配置：

```toml
baseURL = "https://你的GitHub用户名.github.io/"
locale = "zh-CN"
title = "我的博客"
theme = "PaperMod"
```

请将 `baseURL` 替换为自己的网站地址。

#### 第四步：编写第一篇文章

创建 `content/posts/hello-world.md`，内容如下：

```markdown
---
title: "Hello World"
date: 2026-10-14
draft: false
tags: ["随笔"]
---

这是我的第一篇博客。

## 为什么写博客？

- 记录计算机系统学习笔记
- 总结项目开发经验
- 整理技术文章
```

文章开头的 YAML Front Matter 用于描述文章的标题、日期、草稿状态和标签等元信息，后面的部分则是正文。

以后写文章，只需要在 `content/posts/` 目录下新增 Markdown 文件即可。

#### 第五步：本地预览和构建

在项目根目录执行：

```bash
hugo server -D
```

终端会显示本地预览地址。打开该地址，就可以检查文章内容、主题样式和页面布局。

确认无误后，可以执行：

```bash
hugo --minify
```

Hugo 会将网站生成到 `public/` 目录。`--minify` 会压缩生成的 HTML、CSS、JavaScript 等支持的资源。

### 2.3 使用 GitHub Pages 托管博客

#### 第一步：创建 GitHub 仓库

在 GitHub 上创建一个公开仓库，仓库名称使用：

```text
你的GitHub用户名.github.io
```

例如，用户名为 `example` 时，仓库名称就是 `example.github.io`。

然后在博客项目根目录执行：

```bash
git add .
git commit -m "Initial blog"

git branch -M main
git remote add origin \
  https://github.com/你的GitHub用户名/你的GitHub用户名.github.io.git

git push -u origin main
```

这样就将博客源文件推送到了 GitHub。

#### 第二步：配置自动部署

为了避免每次修改文章后都手动构建和上传 `public/`，可以使用 GitHub Actions 自动部署。

在项目根目录创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy Hugo Blog

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: "0.158.0"
          extended: true

      - name: Build
        run: hugo --minify

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public
```

这里的 Hugo 版本只是示例。实际使用时，应选择一个稳定版本，并确保本地和工作流使用相同版本。`extended: true` 用于安装支持 Extended 功能的 Hugo 版本。

工作流主要完成四件事：

1. 拉取博客源代码及 PaperMod 子模块。
2. 安装指定版本的 Hugo。
3. 执行 `hugo --minify`，生成静态网站。
4. 将 `public/` 目录发布到 `gh-pages` 分支。

#### 第三步：提交部署配置

```bash
git add .github/workflows/deploy.yml
git commit -m "Add automatic deployment"
git push
```

进入 GitHub 仓库的 **Settings → Pages**，在 Build and deployment 中选择：

- Source：`Deploy from a branch`
- Branch：`gh-pages`
- Folder：`/(root)`

保存后，打开 Actions 页面，确认 `Deploy Hugo Blog` 工作流执行成功。

这套方式使用独立的 `gh-pages` 分支存放生成后的静态文件。`main` 分支保存博客源代码，`gh-pages` 分支保存网站构建产物。

#### 第四步：发布新文章

完成上述配置后，日常发布文章只需要以下步骤：

```bash
# 1. 创建文章
hugo new content posts/cpp-notes.md

# 2. 编辑文章，将 draft 设置为 false

# 3. 提交并推送
git add content/posts/
git commit -m "Add C++ notes"
git push
```

GitHub Actions 会自动完成构建和部署。工作流成功后，等待 GitHub Pages 更新即可访问新文章。

### 2.4 配置归档、分类和标签

完成基础部署后，还可以进一步完善博客的内容组织方式。

#### 归档页面

在 `content/` 目录下创建 `archives.md`：

```yaml
---
title: "归档"
layout: "archives"
url: "/archives/"
summary: "文章归档"
---
```

PaperMod 提供了归档页面布局，可以用来集中展示历史文章。创建该页面后，还需要在导航菜单中添加对应入口。

#### 分类与标签

分类（Categories）和标签（Tags）都用于组织文章，但侧重点不同：

- **分类：** 用于表示文章所属的领域或主题，例如「博客」「操作系统」「计算机网络」。
- **标签：** 用于标记文章涉及的具体技术或知识点，例如「Hugo」「GitHub Actions」「C++」。

在文章的 Front Matter 中添加：

```yaml
tags: ["博客搭建", "Hugo"]
categories: ["博客"]
```

文章发布后，PaperMod 可以根据这些元信息生成对应的分类与标签页面。

#### 完整的 `hugo.toml`

以下是一个配置示例，包含主题设置、首页介绍、社交链接以及导航菜单：

```toml
baseURL = "https://你的GitHub用户名.github.io/"
locale = "zh-CN"
title = "我的博客"
theme = "PaperMod"

[params]
  env = "production"
  defaultTheme = "auto"
  ShowReadingTime = true
  ShowToc = true
  TocOpen = false
  ShowCodeCopyButtons = true
  ShowPostNavLinks = true
  ShowBreadCrumbs = true
  ShowWordCount = true
  ShowShareButtons = false

[params.homeInfoParams]
  Title = "Things worth understanding."
  Content = "记录值得深入理解的技术问题：C++、算法、操作系统、网络、数据库与计算机体系结构。少一些浮于表面的结论，多一些原理、代码与实践。"

[[params.socialIcons]]
  name = "github"
  url = "https://github.com/你的GitHub用户名"

[[params.socialIcons]]
  name = "wechat"
  url = "/images/QRcode.jpg"
  title = "微信"

[markup.highlight]
  noClasses = false
  codeFences = true
  guessSyntax = false
  style = "github"
  lineNos = false
  tabWidth = 4

[[menu.main]]
  identifier = "posts"
  name = "文章"
  url = "/posts/"
  weight = 10

[[menu.main]]
  identifier = "archives"
  name = "归档"
  url = "/archives/"
  weight = 20

[[menu.main]]
  identifier = "categories"
  name = "分类"
  url = "/categories/"
  weight = 30

[[menu.main]]
  identifier = "tags"
  name = "标签"
  url = "/tags/"
  weight = 40

[[menu.main]]
  identifier = "about"
  name = "关于"
  url = "/about/"
  weight = 50
```

请将示例中的用户名和网站地址替换为自己的信息。如果需要添加其他菜单项，也可以沿用 `[[menu.main]]` 的写法。

#### 配置微信二维码

如果希望读者点击微信图标后查看二维码，可以将二维码图片放入 `static/images/QRcode.jpg`。

目录结构如下：

```text
static/
└── images/
    └── QRcode.jpg
```

由于 Hugo 会将 `static/` 下的文件复制到网站根目录，因此部署后可以通过 `/images/QRcode.jpg` 访问该图片。

## 3. 添加更多功能

### 3.1 添加照片墙

除了技术文章，我还希望在博客中创建一个独立的照片墙，用于记录生活中有意思的照片。

#### 第一步：创建目录和页面

在博客根目录执行：

```bash
mkdir -p layouts/shortcodes
mkdir -p static/images/gallery
hugo new content photos.md
```

其中：

- `layouts/shortcodes/` 用于存放自定义 Hugo shortcode 模板。
- `static/images/gallery/` 用于存放照片。
- `content/photos.md` 是照片墙页面的 Markdown 文件。

#### 第二步：编写照片墙组件

在 `layouts/shortcodes/` 目录下创建 `gallery.html`：

```html
<div class="photo-gallery">
  {{- range .Params -}}
    <a class="photo-gallery-item"
       href="{{ . | relURL }}"
       target="_blank"
       rel="noopener">
      <img src="{{ . | relURL }}"
           alt="照片"
           loading="lazy">
    </a>
  {{- end -}}
</div>
```

该组件会遍历 shortcode 接收到的图片路径，为每张照片生成一个缩略图。点击照片后，可以在新标签页中查看原图。

#### 第三步：添加照片

将希望展示的照片放入 `static/images/gallery/`。例如：

```text
static/
└── images/
    └── gallery/
        ├── photo1.jpg
        ├── photo2.jpg
        └── photo3.jpg
```

#### 第四步：编写照片墙页面

编辑 `content/photos.md`：

```markdown
---
title: "照片墙"
draft: false
description: "记录生活中的风景与瞬间"
---

这里收藏一些值得记录的风景与瞬间。

# 我们和篮球

{{</* gallery
  "images/gallery/photo1.jpg"
  "images/gallery/photo2.jpg"
  "images/gallery/photo3.jpg"
*/>}}
```

图片路径对应 `static/` 目录下的文件。Hugo 构建时会将 `static/images/gallery/` 中的文件复制到网站的对应路径。

#### 第五步：设置照片墙样式

在 `assets/css/extended/custom.css` 中追加：

```css
/* Photo gallery */
.photo-gallery {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin: 1.5rem 0;
}

.photo-gallery-item {
    display: block;
    overflow: hidden;
    aspect-ratio: 4 / 3;
    border-radius: 8px;
    background: var(--code-bg);
}

.photo-gallery-item img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.photo-gallery-item:hover img {
    transform: scale(1.05);
}

@media (max-width: 768px) {
    .photo-gallery {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
    }
}
```

这里使用 CSS Grid 实现网格布局，并通过 `object-fit: cover` 统一缩略图的显示比例。鼠标悬停时，照片会轻微放大；移动端则自动调整为每行两张照片。

#### 第六步：添加导航入口

在 `hugo.toml` 现有的 `[[menu.main]]` 配置后追加：

```toml
[[menu.main]]
  identifier = "photos"
  name = "照片墙"
  url = "/photos/"
  weight = 60
```

保存后运行：

```bash
hugo server -D
```

访问 `http://localhost:1313/photos/`，即可预览照片墙。点击顶部导航栏中的「照片墙」，也可以进入该页面。

照片墙完成后，只需要向 `static/images/gallery/` 添加照片，并在 `photos.md` 中追加对应路径，就能继续扩充相册。

### 3.2 优化文章目录：左侧固定与当前章节高亮

对于包含大量层级标题的技术文章，默认的文章目录不够方便。我们可以对 PaperMod 的目录进行两项改进：

- **左侧固定目录：** 将目录放到文章正文左侧，并在滚动页面时保持可见。
- **当前章节高亮：** 阅读正文时，目录自动突出显示当前所在章节，方便快速定位。

整个实现只需要自定义 CSS 和少量 JavaScript，不需要修改 PaperMod 主题源码。

#### 第一步：启用文章目录

首先，在项目根目录的 `hugo.toml` 中确认已经启用目录：

```toml
[params]
  ShowToc = true
  TocOpen = true
```

`ShowToc = true` 用于显示文章目录，`TocOpen = true` 表示默认展开目录。

#### 第二步：将目录固定在左侧

在 `assets/css/extended/custom.css` 中添加以下样式：

```css
/* 左侧固定文章目录：仅在宽屏设备启用 */
@media screen and (min-width: 1400px) {
    .post-single details.toc {
        position: fixed;
        top: 100px;

        /* 目录宽度与水平位置 */
        width: 300px;
        left: max(20px, calc((100vw - 1100px) / 2 - 340px));

        /* 限制高度，避免目录超出视口 */
        max-height: calc(100vh - 130px);
        overflow-y: auto;
        overflow-x: hidden;

        z-index: 10;
    }

    /* 目录内部留白 */
    .post-single details.toc .inner {
        padding: 0 12px 12px;
    }

    /* 减小多级目录的缩进 */
    .post-single details.toc ul {
        padding-left: 14px;
        margin: 6px 0;
    }

    .post-single details.toc li {
        margin: 5px 0;
        line-height: 1.5;
    }

    /* 优化目录文字的显示 */
    .post-single details.toc a {
        font-size: 13px;
        line-height: 1.5;
        overflow-wrap: break-word;
        word-break: normal;
    }
}
```

这里使用 `position: fixed` 将目录固定在浏览器视口中，`top: 100px` 用于控制目录与页面顶部之间的距离。目录宽度设为 `300px`，同时适当减小多级列表的缩进，以减少标题频繁换行的问题。

媒体查询限制了生效的屏幕宽度。对于较窄的屏幕，继续使用 PaperMod 默认的目录布局，避免目录遮挡正文。

需要注意，`1100px` 是定位公式中用于估算正文区域的参考宽度。如果目录与正文发生重叠，可以根据实际页面布局调整 `left` 公式中的数值。

#### 第三步：编写滚动高亮脚本

PaperMod 的目录通常使用 `<details class="toc">` 作为容器，目录链接位于 `.inner` 中。

在项目根目录创建 `static/js/toc-scrollspy.js`：

```javascript
document.addEventListener("DOMContentLoaded", () => {
    const toc = document.querySelector(
        ".post-single details.toc"
    );
    const content = document.querySelector(".post-content");

    if (!toc || !content) {
        console.warn("[TOC] 未找到目录或正文");
        return;
    }

    const links = Array.from(
        toc.querySelectorAll(".inner a[href*='#']")
    );

    const linkById = new Map();

    // 建立正文标题 ID 与目录链接的映射
    links.forEach((link) => {
        try {
            const url = new URL(link.href, window.location.href);
            const id = decodeURIComponent(url.hash.slice(1));

            if (id) {
                linkById.set(id, link);
            }
        } catch {
            // 忽略无法解析的链接
        }
    });

    // 获取正文中的标题
    const headings = Array.from(
        content.querySelectorAll(
            "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]"
        )
    );

    // 只处理在目录中存在对应链接的标题
    const targets = headings.filter(
        (heading) => linkById.has(heading.id)
    );

    if (!targets.length) {
        console.warn("[TOC] 没有匹配到目录标题");
        return;
    }

    let activeId = "";

    function updateActive() {
        // 距离视口顶部 140px 的位置作为阅读基准线
        const marker = 140;
        let current = targets[0];

        for (const heading of targets) {
            if (heading.getBoundingClientRect().top <= marker) {
                current = heading;
            } else {
                break;
            }
        }

        if (current.id === activeId) return;
        activeId = current.id;

        // 清除之前的高亮状态
        links.forEach((link) => {
            link.classList.remove("active");
            link.removeAttribute("aria-current");
        });

        // 高亮当前章节
        const activeLink = linkById.get(activeId);

        if (activeLink) {
            activeLink.classList.add("active");
            activeLink.setAttribute("aria-current", "location");
        }
    }

    // 页面滚动时更新高亮状态
    window.addEventListener("scroll", updateActive, {
        passive: true
    });

    window.addEventListener("resize", updateActive);

    // 点击目录跳转后更新高亮状态
    links.forEach((link) => {
        link.addEventListener("click", () => {
            window.setTimeout(updateActive, 50);
        });
    });

    // 初始化高亮状态
    updateActive();

    console.log(
        "[TOC] 滚动高亮已启用，匹配标题数：",
        targets.length
    );
});
```

脚本的核心逻辑是：监听页面滚动，找到正文中位于阅读基准线之前的最近一个标题，再将对应目录链接标记为 `active`。通过这种方式，目录可以随着阅读位置自动切换高亮项。

#### 第四步：加载 JavaScript

创建或编辑 `layouts/partials/extend_footer.html`，添加：

```html
<script src="{{ "js/toc-scrollspy.js" | relURL }}" defer></script>
```

如果该文件已经存在其他内容，只需要追加这一行，不要覆盖原有内容。

这里使用 Hugo 的 `relURL` 函数生成脚本地址，可以适配不同的站点部署路径。

#### 第五步：设置当前章节的高亮样式

继续在 `assets/css/extended/custom.css` 中追加：

```css
/* 当前阅读章节的高亮样式 */
.post-single details.toc .inner a.active {
    color: var(--primary);
    font-weight: 700;
    border-left: 3px solid var(--primary);
    padding-left: 8px;
    background: var(--code-bg);
    border-radius: 3px;
}

/* 高亮状态平滑过渡 */
.post-single details.toc .inner a {
    transition:
        color 0.2s ease,
        background-color 0.2s ease;
}
```

这里使用 PaperMod 的主题颜色变量，使高亮效果能够适配浅色和深色模式。左侧边框和加粗字体可以让当前章节更加醒目。

#### 第六步：本地预览与验证

在项目根目录运行：

```bash
hugo server -D
```

打开一篇包含多个层级标题的文章，检查以下效果：

1. 在宽屏设备上，文章目录是否固定在正文左侧。
2. 向下滚动正文时，当前章节是否自动高亮。
3. 点击目录中的标题后，是否可以正常跳转。
4. 在较窄的屏幕上，目录是否恢复为主题默认布局。

也可以在浏览器开发者工具的 Console 中执行：

```javascript
document.querySelectorAll(
    ".post-single details.toc .inner a.active"
).length
```

正常情况下，结果应为 `1`，表示当前有一个目录项处于高亮状态。

如果没有生效，可以检查脚本是否成功加载、目录选择器是否与实际 HTML 结构一致，以及正文标题的锚点是否与目录链接对应。

通过以上改造，PaperMod 的文章目录就具备了左侧固定显示和当前章节高亮两项功能，能够更好地支持长篇技术文章的阅读与导航。


### 3.3 未完待续

后续还可以继续完善搜索、评论、图片灯箱、文章目录和阅读体验等功能。对个人技术博客而言，我更倾向于先保持结构简单、部署可靠，再根据实际需要逐步扩展。