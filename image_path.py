#!/usr/bin/env python3
"""
将 Markdown 中图片路径统一改为 static/images/posts/ysyx-f5/<文件名>
用法: python fix_paths.py input.md [output.md]
"""
import re
import sys
from pathlib import Path

TARGET_PREFIX = "/images/posts/net-sys1/"

def convert(md_text: str) -> str:
    # 匹配 ![alt](path) 或 ![alt](path "title")
    # 只处理图片，不处理普通链接
    pattern = re.compile(r'(!\[[^\]]*\]\()([^)\s]+)(\s+"[^"]*")?(\))')

    def repl(m):
        prefix, raw_path, title, suffix = m.group(1), m.group(2), m.group(3) or "", m.group(4)
        # 取原文件名（去掉任何目录和查询参数）
        filename = raw_path.split("/")[-1].split("?")[0]
        new_path = TARGET_PREFIX + filename
        return f"{prefix}{new_path}{title}{suffix}"

    return pattern.sub(repl, md_text)

def main():
    if len(sys.argv) < 2:
        print("用法: python fix_paths.py input.md [output.md]")
        sys.exit(1)
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else src
    text = src.read_text(encoding="utf-8")
    new_text = convert(text)
    dst.write_text(new_text, encoding="utf-8")
    print(f"已处理: {src} -> {dst}")

if __name__ == "__main__":
    main()