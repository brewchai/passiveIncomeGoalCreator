#!/usr/bin/env python3
"""
Render the B-style cover for a blog post: the post's photo, a directional scrim,
an eyebrow, and a short hook — burned into a 1200x675 webp.

Reads three fields from the post's meta.json:
    hook         short headline for the image, 4-8 words (NOT the SEO title)
    hook_accent  the substring inside `hook` that takes the accent colour
    scrim_side   "left" | "right" — put it on the side AWAY from the subject
    photo_pos    CSS background-position, e.g. "30% 20%" — pans within the frame
    photo_zoom   CSS background-size, "cover" (default) or e.g. "130%" to zoom in
                 so there is slack to pan. Needed when the base is already 16:9.
    cover_base   the underlying photo; set automatically on first run

Usage:
    python3 tools/make_thumb.py <post-slug> [...]      # one or more slugs
    python3 tools/make_thumb.py --all                  # every post that has a hook
    python3 tools/make_thumb.py <slug> --build         # then rebuild the blog

Renders via headless Chrome (no extra Python deps) and encodes with cwebp.
"""
import argparse, html, json, shutil, subprocess, sys, tempfile
from pathlib import Path

FRONTEND = Path(__file__).resolve().parent.parent
POSTS = FRONTEND / "blog" / "posts"
TPL = FRONTEND / "tools" / "thumb" / "template.html"
FONT = FRONTEND / "fonts" / "manrope-latin.woff2"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def hook_size(text: str) -> int:
    """Long hooks step down so they never overflow the 63% text column."""
    n = len(text)
    return 76 if n <= 26 else 68 if n <= 38 else 60 if n <= 52 else 52

def render(slug: str) -> bool:
    d = POSTS / slug
    mp = d / "meta.json"
    if not mp.exists():
        print(f"  {slug}: no meta.json"); return False
    meta = json.loads(mp.read_text())

    hook = (meta.get("hook") or "").strip()
    if not hook:
        print(f"  {slug}: no `hook` — skipped (write one in meta.json)"); return False

    typeonly = bool(meta.get("type_only"))
    base = (meta.get("cover_base") or meta.get("cover") or "").strip()
    if not base and not typeonly:
        print(f"  {slug}: no cover to build on"); return False
    photo = Path(base.lstrip("/")) if base.startswith("/") else d / base
    photo = photo if photo.is_absolute() else (FRONTEND / photo if base.startswith("/") else photo)
    if not typeonly and not photo.exists():
        print(f"  {slug}: photo missing at {photo}"); return False

    side = (meta.get("scrim_side") or "left").lower()
    accent = (meta.get("hook_accent") or "").strip()
    tags = meta.get("tags") or []
    eyebrow = (meta.get("eyebrow") or (tags[0].replace("-", " ") if tags else "But First Fire"))

    esc = html.escape(hook)
    if accent and html.escape(accent) in esc:
        esc = esc.replace(html.escape(accent), f"<em>{html.escape(accent)}</em>", 1)

    tpl = TPL.read_text()
    out_png = Path(tempfile.mktemp(suffix=".png"))
    page = Path(tempfile.mktemp(suffix=".html"))
    page.write_text(tpl
        .replace("__FONT__", FONT.resolve().as_uri())
        .replace("__BGIMAGE__", "none" if typeonly else f"url('{photo.resolve().as_uri()}')")
        .replace("__POS__", (meta.get("photo_pos") or "center").strip())
        .replace("__ZOOM__", (meta.get("photo_zoom") or "cover").strip())
        .replace("__ANGLE__", "100deg" if side == "left" else "260deg")
        .replace("__ALIGN__", "flex-start" if side == "left" else "flex-end")
        .replace("__TALIGN__", "left" if side == "left" else "right")
        .replace("__SIZE__", str(hook_size(hook)))
        .replace("__EYEBROW__", html.escape(eyebrow))
        .replace("__HOOK__", esc))

    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=2", "--window-size=1200,675",
                    "--virtual-time-budget=4000",
                    f"--screenshot={out_png}", page.resolve().as_uri()],
                   check=True, capture_output=True)

    stem = (photo.stem.removesuffix("-photo") if photo.exists() else slug)
    dest = d / f"{stem}-card.webp"
    if shutil.which("cwebp"):
        subprocess.run(["cwebp", "-q", "80", str(out_png), "-o", str(dest)],
                       check=True, capture_output=True)
    else:
        from PIL import Image
        Image.open(out_png).convert("RGB").save(dest, "WEBP", quality=86, method=6)

    if photo.exists(): meta["cover_base"] = photo.name
    meta["cover"] = dest.name
    mp.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n")
    print(f"  {slug}: {dest.name}  ({dest.stat().st_size//1024} KB, scrim {side})")
    out_png.unlink(missing_ok=True); page.unlink(missing_ok=True)
    return True

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slugs", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--build", action="store_true")
    a = ap.parse_args()
    if not Path(CHROME).exists():
        sys.exit(f"Chrome not found at {CHROME}")
    slugs = a.slugs
    if a.all:
        slugs = sorted(p.parent.name for p in POSTS.rglob("meta.json")
                       if (json.loads(p.read_text()).get("hook") or "").strip())
    if not slugs:
        sys.exit("nothing to do — pass slugs or --all")
    n = sum(render(s) for s in slugs)
    print(f"\n{n}/{len(slugs)} rendered")
    if a.build and n:
        subprocess.run(["python3", str(FRONTEND / "tools" / "build_blog.py")], check=True)

if __name__ == "__main__":
    main()
