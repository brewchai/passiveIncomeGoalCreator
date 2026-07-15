#!/usr/bin/env python3
"""
Add a cover image to a blog post in one shot.

Takes ANY image (HEIC straight from Google Photos, JPG, PNG, WEBP), converts
it to a web-optimised 16:9 WEBP, names it with a keyword filename, drops it in
the post folder, and updates meta.json (cover + optional cover_alt).

Usage:
    python3 tools/add_cover.py <image> <post-slug> [options]

Options:
    --alt "text"     Descriptive, keyword-rich alt text (recommended for SEO).
    --stem name      Filename stem (default: the post slug).
    --focus top|center   Vertical crop anchor for tall images (default: center).
                         Use `top` for portraits so heads/faces aren't cut off.
    --width N        Output width in px (default: 1200; height is 9/16 of it).
    --quality N      WEBP quality 0-100 (default: 82).
    --build          Run build_blog.py afterwards.
    --dry-run        Convert to /tmp and report, without touching the post.

Examples:
    python3 tools/add_cover.py ~/Downloads/IMG_4821.HEIC is-lean-fire-right-for-you \\
        --alt "Deciding whether Lean FIRE is right for you over coffee" --build
"""
import argparse, json, shutil, subprocess, sys, tempfile
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install pillow")

FRONTEND = Path(__file__).resolve().parent.parent
POSTS_DIR = FRONTEND / "blog" / "posts"


def load_image(path: Path) -> "Image.Image":
    """Open any image. Falls back to macOS `sips` for HEIC and friends."""
    try:
        return Image.open(path).convert("RGB")
    except Exception:
        if not shutil.which("sips"):
            sys.exit(f"Could not read {path} and `sips` is unavailable for HEIC.")
        tmp = Path(tempfile.mktemp(suffix=".png"))
        subprocess.run(["sips", "-s", "format", "png", str(path), "--out", str(tmp)],
                       check=True, capture_output=True)
        return Image.open(tmp).convert("RGB")


def crop_16_9(im: "Image.Image", focus: str = "center") -> "Image.Image":
    w, h = im.size
    target = 16 / 9
    if w / h > target:                      # too wide: trim the sides
        nw = int(round(h * target))
        x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = int(round(w / target))             # too tall: trim top/bottom
    y = 0 if focus == "top" else (h - nh) // 2
    return im.crop((0, y, w, y + nh))


def save_webp(im: "Image.Image", dest: Path, quality: int) -> None:
    if shutil.which("cwebp"):
        tmp = Path(tempfile.mktemp(suffix=".png"))
        im.save(tmp)
        subprocess.run(["cwebp", "-q", str(quality), str(tmp), "-o", str(dest)],
                       check=True, capture_output=True)
    else:
        im.save(dest, "WEBP", quality=quality, method=6)


def main() -> None:
    ap = argparse.ArgumentParser(description="Add a 16:9 WEBP cover to a blog post.")
    ap.add_argument("image")
    ap.add_argument("slug")
    ap.add_argument("--alt", default=None)
    ap.add_argument("--stem", default=None)
    ap.add_argument("--focus", choices=["center", "top"], default="center")
    ap.add_argument("--width", type=int, default=1200)
    ap.add_argument("--quality", type=int, default=82)
    ap.add_argument("--build", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    src = Path(a.image).expanduser()
    if not src.exists():
        sys.exit(f"Image not found: {src}")

    post_dir = POSTS_DIR / a.slug
    if not a.dry_run and not (post_dir / "meta.json").exists():
        sys.exit(f"No post at {post_dir} (need a meta.json). Check the slug.")

    stem = a.stem or a.slug
    size = (a.width, int(round(a.width * 9 / 16)))

    im = crop_16_9(load_image(src), a.focus).resize(size, Image.LANCZOS)

    if a.dry_run:
        out = Path(tempfile.mktemp(suffix=".webp"))
        save_webp(im, out, a.quality)
        print(f"[dry-run] {src.name} -> {out} ({size[0]}x{size[1]}, {out.stat().st_size//1024} KB)")
        return

    dest = post_dir / f"{stem}.webp"
    save_webp(im, dest, a.quality)

    mp = post_dir / "meta.json"
    d = json.loads(mp.read_text())
    d["cover"] = dest.name
    if a.alt:
        d["cover_alt"] = a.alt
    mp.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n")

    print(f"cover  -> {dest.relative_to(FRONTEND)} ({size[0]}x{size[1]}, {dest.stat().st_size//1024} KB)")
    print(f"meta   -> cover={dest.name!r}" + (f", cover_alt set" if a.alt else " (no --alt given)"))

    if a.build:
        subprocess.run(["python3", str(FRONTEND / "tools" / "build_blog.py")], check=True)
        print("build  -> done")
    else:
        print("next   -> run: python3 tools/build_blog.py")


if __name__ == "__main__":
    main()
