
document.addEventListener("DOMContentLoaded", () => {
    const toc = document.querySelector(".post-single details.toc");
    const content = document.querySelector(".post-content");

    if (!toc || !content) {
        console.warn("[TOC] 未找到目录或正文", { toc, content });
        return;
    }

    const links = Array.from(toc.querySelectorAll(".inner a[href*='#']"));
    const linkById = new Map();

    links.forEach((link) => {
        try {
            const url = new URL(link.href, window.location.href);
            const id = decodeURIComponent(url.hash.slice(1));
            if (id) linkById.set(id, link);
        } catch (error) {
            console.warn("[TOC] 无法解析目录链接", link.href);
        }
    });

    const headings = Array.from(
        content.querySelectorAll("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]")
    );

    const targets = headings.filter((heading) => linkById.has(heading.id));

    if (!targets.length) {
        console.warn("[TOC] 没有匹配到标题", {
            links: links.length,
            headings: headings.length
        });
        return;
    }

    let activeId = "";

    function updateActive() {
        // 页面滚动到顶部附近时，优先选择最靠近阅读基准线的标题
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

        links.forEach((link) => {
            link.classList.remove("active");
            link.removeAttribute("aria-current");
        });

        const activeLink = linkById.get(activeId);

        if (activeLink) {
            activeLink.classList.add("active");
            activeLink.setAttribute("aria-current", "location");

            // 如果目录自身可以滚动，让当前项尽量保持可见
            const tocInner = toc.querySelector(".inner");
            const tocRect = toc.getBoundingClientRect();
            const linkRect = activeLink.getBoundingClientRect();

            if (tocInner && (linkRect.top < tocRect.top || linkRect.bottom > tocRect.bottom)) {
                activeLink.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        }
    }

    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);

    // 点击目录跳转后，也立即更新状态
    links.forEach((link) => {
        link.addEventListener("click", () => {
            window.setTimeout(updateActive, 50);
        });
    });

    updateActive();

    console.log("[TOC] 滚动高亮已启用，匹配标题数：", targets.length);
});
