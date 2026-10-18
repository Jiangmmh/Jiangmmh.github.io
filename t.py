from pathlib import Path
import re

# 博客根目录
root = Path(".")

# 匹配 ysyx-f4 目录下 image1.png、image10.png 等引用
pattern = re.compile(
    r"(/images/posts/ysyx-f4/image)(\d+)(\.png)"
)

for md_file in (root / "content").rglob("*.md"):
    text = md_file.read_text(encoding="utf-8")

    fixed, count = pattern.subn(r"\1%20\2\3", text)

    if count:
        # 修改前备份原文件
        backup = md_file.with_suffix(md_file.suffix + ".bak")
        backup.write_text(text, encoding="utf-8")

        md_file.write_text(fixed, encoding="utf-8")
        print(f"已修复 {md_file}：{count} 处引用")