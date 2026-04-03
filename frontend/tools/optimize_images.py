#!/usr/bin/env python3
import json
import os
import subprocess
import sys
from pathlib import Path

# Ensure Pillow is installed
try:
    from PIL import Image
except ImportError:
    print("Pillow not found. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

FRONTEND = Path(__file__).resolve().parents[1]
POSTS_DIR = FRONTEND / "blog" / "posts"

MAX_WIDTH = 1600

def optimize_image(img_path: Path) -> Path:
    """Resizes and converts image to WebP, deletes original, returns new path."""
    with Image.open(img_path) as img:
        # Convert RGBA to RGB for WebP compat if needed (WebP supports alpha, but just in case)
        if img.mode in ("RGBA", "LA") and img_path.suffix.lower() == ".jpg":
             pass # keep alpha if we can, WebP allows it.
             
        # Resize if too large
        width, height = img.size
        new_width = width
        new_height = height
        if width > MAX_WIDTH:
            ratio = MAX_WIDTH / width
            new_width = MAX_WIDTH
            new_height = int(height * ratio)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        webp_path = img_path.with_suffix(".webp")
        # Save as WebP
        img.save(webp_path, "WEBP", quality=80, method=4)
        
    # Delete original
    if img_path != webp_path:
        img_path.unlink()
    return webp_path

def main():
    if not POSTS_DIR.exists():
        print("Posts dir not found!")
        return

    count = 0
    total_saved = 0

    for post_dir in [p for p in POSTS_DIR.iterdir() if p.is_dir()]:
        meta_path = post_dir / "meta.json"
        
        if not meta_path.exists():
            continue
            
        with open(meta_path, 'r') as f:
            meta = json.load(f)
            
        cover_val = meta.get("cover")
        if not cover_val:
            continue
            
        # Parse what the actual file is
        # Cover val could be "cover.jpg" or "/blog/posts/slug/cover.jpg"
        file_name = cover_val.split("/")[-1]
        img_path = post_dir / file_name
        
        if not img_path.exists() or img_path.suffix.lower() == ".webp":
            continue
            
        orig_size = img_path.stat().st_size
        print(f"Optimizing {img_path.name} in {post_dir.name} ({orig_size / 1024:.1f} KB)")
        
        try:
            new_path = optimize_image(img_path)
            new_size = new_path.stat().st_size
            saved = orig_size - new_size
            total_saved += saved
            print(f"  -> Reduced to {new_size / 1024:.1f} KB (saved {saved / 1024:.1f} KB)")
            
            # Update meta.json
            new_cover_val = cover_val.replace(img_path.suffix, ".webp")
            meta["cover"] = new_cover_val
            with open(meta_path, "w") as f:
                json.dump(meta, f, indent=4)
            count += 1
            
        except Exception as e:
            print(f"Failed to process {img_path}: {e}")
            
    print(f"\nOptimization complete! Converted {count} images.")
    print(f"Total space saved: {total_saved / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    main()
