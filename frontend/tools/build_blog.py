#!/usr/bin/env python3
import json
import os
from pathlib import Path
from datetime import datetime

try:
    import markdown  # pip install markdown
except ImportError:
    raise SystemExit("Missing dependency: pip install markdown")

# Paths
THIS = Path(__file__).resolve()
FRONTEND = THIS.parents[1]
BLOG_DIR = FRONTEND / "blog"
POSTS_DIR = BLOG_DIR / "posts"
TEMPLATE_PATH = BLOG_DIR / "post_template.html"
OUTPUT_INDEX = "index.html"

# Config
BASE_URL = os.environ.get("BASE_URL", "").rstrip("/")  # e.g., https://your-domain.com

ASSET_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}

def iso_date(s: str) -> str:
    # Validates and normalizes ISO date
    try:
        dt = datetime.fromisoformat(s)
        return dt.date().isoformat()
    except Exception:
        raise ValueError(f"Invalid date (use YYYY-MM-DD): {s}")

def load_template() -> str:
    if not TEMPLATE_PATH.exists():
        raise FileNotFoundError(f"Template not found: {TEMPLATE_PATH}")
    return TEMPLATE_PATH.read_text(encoding="utf-8")

def strip_leading_h1(html: str) -> str:
    # Remove the very first <h1>...</h1> block if present (avoid duplicate title)
    import re
    return re.sub(r"^\s*<h1[^>]*>.*?</h1>\s*", "", html, flags=re.IGNORECASE | re.DOTALL)

def calculate_read_time(text: str) -> int:
    """Calculate read time in minutes based on word count (200 wpm average)"""
    import re
    # Strip HTML tags and count words
    clean_text = re.sub(r'<[^>]+>', '', text)
    words = len(clean_text.split())
    minutes = max(1, round(words / 200))  # At least 1 minute
    return minutes

def process_live_tags(text: str) -> str:
    """
    Replaces:
      {{ var:name:default }} -> <span class="live-var" data-name="name" contenteditable="true">default</span>
      {{ calc:formula }}     -> <span class="live-calc" data-formula="formula">...</span>
    """
    import re
    
    # 1. Variables: {{ var:savings_rate:20% }}
    # We strip whitespace around name/default
    def _repl_var(match):
        name = match.group(1).strip()
        default_val = match.group(2).strip()
        # Basic cleanup for numeric display if needed, but keeping it raw is safer for now
        return f'<span class="live-var" data-name="{name}" contenteditable="true">{default_val}</span>'

    text = re.sub(r"\{\{\s*var:([^:]+):([^}]+)\s*\}\}", _repl_var, text)

    # 2. Calculations: {{ calc: (monthly_expenses * 12) / 0.04 }}
    def _repl_calc(match):
        formula = match.group(1).strip()
        return f'<span class="live-calc" data-formula="{formula}">...</span>'

    text = re.sub(r"\{\{\s*calc:([^}]+)\s*\}\}", _repl_calc, text)
    
    return text


def render_html(template: str, *, slug: str, meta: dict, html_content: str) -> str:
    title = meta["title"].strip()
    description = meta.get("description", "").strip()
    subtitle = meta.get("subtitle", "").strip() or description
    date = iso_date(meta["date"])
    cover = meta.get("cover", "").strip()
    # Canonical path/URL
    canonical_path = f"/blog/{slug}"
    canonical_abs = f"{BASE_URL}{canonical_path}" if BASE_URL else canonical_path
    
    # Fix cover path: if relative, prepend full blog post path
    if cover and not cover.startswith("/"):
        cover = f"/blog/posts/{slug}/{cover}"
    cover_abs = f"{BASE_URL}{cover}" if (BASE_URL and cover) else cover

    hero_html = f'<img src="{cover_abs}" alt="{title} cover" style="width:100%; border-radius: 12px; margin-top: 0.5rem;">' if cover_abs else ''

    # Remove duplicate H1 at top of content
    html_body = strip_leading_h1(html_content)

    # Calculate read time from content
    read_time = calculate_read_time(html_content)

    # Simple placeholder replacement
    page = (
        template.replace("{{TITLE}}", title)
        .replace("{{DESCRIPTION}}", description)
        .replace("{{SUBTITLE}}", subtitle)
        .replace("{{DATE}}", date)
        .replace("{{READ_TIME}}", str(read_time))
        .replace("{{CANONICAL}}", canonical_abs)
        .replace("{{CANONICAL_PATH}}", canonical_path)
        .replace("{{COVER}}", cover_abs)
        .replace("{{HERO_IMAGE}}", hero_html)
        .replace("{{CONTENT}}", html_body)
    )

    # Basic JSON-LD Article schema
    json_ld = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "image": [cover_abs] if cover_abs else [],
        "datePublished": date,
        "dateModified": date,
        "author": {"@type": "Person", "name": "FIRE Planner"},
        "publisher": {
            "@type": "Organization",
            "name": "FIRE Planner",
            "logo": {"@type": "ImageObject", "url": f"{BASE_URL}/og-image.png"} if BASE_URL else {}
        },
        "mainEntityOfPage": canonical_abs,
    }
    page = page.replace("{{ARTICLE_JSON_LD}}", json.dumps(json_ld, ensure_ascii=False))

    return page

def build_one_post(slug: str, template: str) -> dict:
    folder = POSTS_DIR / slug
    meta_path = folder / "meta.json"
    md_path = folder / "post.md"
    out_path = folder / OUTPUT_INDEX

    if not meta_path.exists() or not md_path.exists():
        raise FileNotFoundError(f"Missing meta.json or post.md in {folder}")

    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    # Convert Markdown to HTML
    md_text = md_path.read_text(encoding="utf-8")
    
    # Pre-process interactions
    md_text = process_live_tags(md_text)

    html_content = markdown.markdown(
        md_text,
        extensions=["extra", "fenced_code", "tables", "toc"]
    )

    # Render final HTML
    html = render_html(template, slug=slug, meta=meta, html_content=html_content)
    out_path.write_text(html, encoding="utf-8")

    # Minimal record for posts.json
    # Fix cover path for JSON output too
    cover_for_json = meta.get("cover", "")
    if cover_for_json and not cover_for_json.startswith("/"):
        cover_for_json = f"/blog/posts/{slug}/{cover_for_json}"
    
    return {
        "slug": slug,
        "title": meta["title"],
        "subtitle": meta.get("subtitle", ""),
        "description": meta.get("description", ""),
        "date": iso_date(meta["date"]),
        "cover": cover_for_json,
        "tags": meta.get("tags", []),
        "featured": bool(meta.get("featured", False)),
        "url": f"/blog/{slug}",
    }

def collect_posts() -> list[dict]:
    if not POSTS_DIR.exists():
        return []
    slugs = [p.name for p in POSTS_DIR.iterdir() if p.is_dir()]
    # Ignore non-post folders
    return sorted(slugs)

def write_posts_index(records: list[dict]) -> None:
    # Split featured and recent
    sorted_records = sorted(records, key=lambda r: r["date"], reverse=True)
    featured = [r for r in sorted_records if r.get("featured")]
    recent = [r for r in sorted_records if not r.get("featured")]

    payload = {
        "featured": featured,
        "recent": recent,
        "all": sorted_records,  # convenience
        "_generated_at": datetime.utcnow().isoformat() + "Z",
    }
    (POSTS_DIR / "posts.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

def main():
    template = load_template()
    posts = []
    for slug in collect_posts():
        folder = POSTS_DIR / slug
        # Only treat as a post if it has meta.json and post.md
        if (folder / "meta.json").exists() and (folder / "post.md").exists():
            print(f"Building: {slug}")
            record = build_one_post(slug, template)
            posts.append(record)
    write_posts_index(posts)
    print(f"Built {len(posts)} post(s). Output: posts.json updated.")

if __name__ == "__main__":
    main()