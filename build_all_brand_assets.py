import os
import math
from PIL import Image, ImageDraw

def build_assets():
    img_path = r'C:/Users/cashkink/.gemini/antigravity/brain/531fc05b-f8fe-4e49-ad37-a2a31d71cfbf/.user_uploaded/media_1791628363195.jpg'
    img = Image.open(img_path).convert('L')
    w, h = img.size

    visited = set()
    components = []
    for y in range(h):
        for x in range(w):
            if img.getpixel((x, y)) < 128 and (x, y) not in visited:
                comp = []
                queue = [(x, y)]
                visited.add((x, y))
                while queue:
                    cx, cy = queue.pop(0)
                    comp.append((cx, cy))
                    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)]:
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                            if img.getpixel((nx, ny)) < 128:
                                visited.add((nx, ny))
                                queue.append((nx, ny))
                components.append(comp)

    components.sort(key=len, reverse=True)
    c0, c1 = set(components[0]), set(components[1])

    def trace_boundary(pixel_set, start_p):
        curr = start_p
        dirs = [(0, -1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1)]
        boundary = [curr]
        backtrack = 6
        while True:
            found = False
            for i in range(8):
                d_idx = (backtrack + 1 + i) % 8
                dx, dy = dirs[d_idx]
                neighbor = (curr[0] + dx, curr[1] + dy)
                if neighbor in pixel_set:
                    curr = neighbor
                    boundary.append(curr)
                    backtrack = (d_idx + 4) % 8
                    found = True
                    break
            if not found or curr == boundary[0]:
                break
            if len(boundary) > 2000:
                break
        return boundary

    b0 = trace_boundary(c0, (59, 38))
    b1 = trace_boundary(c1, (59, 179))

    # Construct clean vector path strings for b0 and b1
    # b0: Top horizontal (59,38) -> (133,38), then curve (74:136), then diagonal cut (155,90) -> (59,164), then spine (59,164) -> (59,38)
    pts_b0_curve = b0[74:136]
    d0_parts = ["M 59 38", "L 133 38"]
    for p in pts_b0_curve:
        d0_parts.append(f"L {p[0]} {p[1]}")
    d0_parts.append("L 59 164")
    d0_parts.append("Z")
    d0_str = " ".join(d0_parts)

    # b1: Diagonal cut (59,179) -> (142,116), then curve (84:171), then bottom horizontal (133,186) -> (59,186), then spine (59,186) -> (59,179)
    pts_b1_curve = b1[84:171]
    d1_parts = ["M 59 179", "L 142 116"]
    for p in pts_b1_curve:
        d1_parts.append(f"L {p[0]} {p[1]}")
    d1_parts.append("L 59 186")
    d1_parts.append("Z")
    d1_str = " ".join(d1_parts)

    print("Generated SVG path strings successfully.")

    # 1. Output SVG files
    svg_template = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 225 225" fill="none">
  <path d="{d0_str}" fill="#FFFFFF" />
  <path d="{d1_str}" fill="#FFFFFF" />
</svg>'''

    svg_favicon_template = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 225 225">
  <rect width="225" height="225" rx="48" fill="#121212" />
  <path d="{d0_str}" fill="#FFFFFF" />
  <path d="{d1_str}" fill="#FFFFFF" />
</svg>'''

    svg_paths_to_write = [
        r'C:/Users/cashkink/Downloads/balarydex/frontend/public/logo.svg',
        r'C:/Users/cashkink/Downloads/balarydex/docs/public/logo.svg',
        r'C:/Users/cashkink/Downloads/balary-logo.svg',
    ]

    for p in svg_paths_to_write:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8') as f:
            f.write(svg_template)
        print(f"Wrote SVG to {p}")

    favicon_svg_paths = [
        r'C:/Users/cashkink/Downloads/balarydex/frontend/public/favicon.svg',
        r'C:/Users/cashkink/Downloads/balarydex/docs/public/favicon.svg',
        r'C:/Users/cashkink/Downloads/balary-favicon.svg',
    ]
    for p in favicon_svg_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8') as f:
            f.write(svg_favicon_template)
        print(f"Wrote Favicon SVG to {p}")

    # 2. High-resolution raster rendering using 4K Supersampling (4096 x 4096)
    def render_raster_glyph(canvas_size, fg_color, bg_color=None, padding_ratio=0.0):
        # canvas_size: final output size (e.g. 1024)
        super_size = 4096
        scale = (super_size * (1.0 - padding_ratio)) / 225.0
        offset_x = (super_size - 225.0 * scale) / 2.0
        offset_y = (super_size - 225.0 * scale) / 2.0

        poly0 = []
        for part in d0_str.split():
            if part not in ['M', 'L', 'Z']:
                poly0.append(float(part))
        poly0 = [(poly0[i] * scale + offset_x, poly0[i+1] * scale + offset_y) for i in range(0, len(poly0), 2)]

        poly1 = []
        for part in d1_str.split():
            if part not in ['M', 'L', 'Z']:
                poly1.append(float(part))
        poly1 = [(poly1[i] * scale + offset_x, poly1[i+1] * scale + offset_y) for i in range(0, len(poly1), 2)]

        base_color = bg_color if bg_color is not None else (0, 0, 0, 0)
        im_super = Image.new('RGBA', (super_size, super_size), base_color)
        draw = ImageDraw.Draw(im_super)
        draw.polygon(poly0, fill=fg_color)
        draw.polygon(poly1, fill=fg_color)

        return im_super.resize((canvas_size, canvas_size), Image.Resampling.LANCZOS)

    print("Rendering 1024x1024 White-on-transparent logo...")
    logo_white_1024 = render_raster_glyph(1024, (255, 255, 255, 255))
    logo_white_1024.save(r'C:/Users/cashkink/Downloads/balarydex/frontend/public/balary-logo-white.png')
    logo_white_1024.save(r'C:/Users/cashkink/Downloads/balarydex/frontend/public/logo.png')
    logo_white_1024.save(r'C:/Users/cashkink/Downloads/balary-logo.png')
    logo_white_1024.save(r'C:/Users/cashkink/Downloads/balary-logo-white.png')

    print("Rendering 1024x1024 Black-on-transparent logo...")
    logo_black_1024 = render_raster_glyph(1024, (10, 10, 10, 255))
    logo_black_1024.save(r'C:/Users/cashkink/Downloads/balarydex/frontend/public/balary-logo-black.png')
    logo_black_1024.save(r'C:/Users/cashkink/Downloads/balary-logo-black.png')

    print("Rendering 1024x1024 Dark Badge Avatar / Icon for Socials & Ecosystem...")
    # Render with rounded badge background
    super_size = 4096
    im_badge_super = Image.new('RGBA', (super_size, super_size), (0, 0, 0, 0))
    draw_badge = ImageDraw.Draw(im_badge_super)
    
    # Draw rounded rectangle container with subtle border
    radius = int(super_size * 0.22)
    draw_badge.rounded_rectangle(
        [(64, 64), (super_size - 64, super_size - 64)],
        radius=radius,
        fill=(18, 18, 18, 255),
        outline=(45, 45, 45, 255),
        width=16
    )

    # Place glyph inside badge with 28% padding
    scale = (super_size * 0.58) / 225.0
    offset_x = (super_size - 225.0 * scale) / 2.0
    offset_y = (super_size - 225.0 * scale) / 2.0

    poly0_badge = []
    for part in d0_str.split():
        if part not in ['M', 'L', 'Z']:
            poly0_badge.append(float(part))
    poly0_badge = [(poly0_badge[i] * scale + offset_x, poly0_badge[i+1] * scale + offset_y) for i in range(0, len(poly0_badge), 2)]

    poly1_badge = []
    for part in d1_str.split():
        if part not in ['M', 'L', 'Z']:
            poly1_badge.append(float(part))
    poly1_badge = [(poly1_badge[i] * scale + offset_x, poly1_badge[i+1] * scale + offset_y) for i in range(0, len(poly1_badge), 2)]

    draw_badge.polygon(poly0_badge, fill=(255, 255, 255, 255))
    draw_badge.polygon(poly1_badge, fill=(255, 255, 255, 255))

    icon_1024 = im_badge_super.resize((1024, 1024), Image.Resampling.LANCZOS)
    icon_1024.save(r'C:/Users/cashkink/Downloads/balarydex/frontend/public/balary-icon.png')
    icon_1024.convert('RGB').save(r'C:/Users/cashkink/Downloads/balarydex/frontend/public/logo-pfp1.jpeg')
    icon_1024.convert('RGB').save(r'C:/Users/cashkink/Downloads/balarydex/frontend/public/logo-pfp2.jpeg')
    icon_1024.save(r'C:/Users/cashkink/Downloads/balary-icon.png')
    icon_1024.save(r'C:/Users/cashkink/Downloads/balary-avatar.png')

    # 3. Multi-resolution Favicon.ico
    # We will build multi-resolution icons: 16, 32, 48, 64, 128, 256
    # With dark rounded container and white glyph so it is visible in both dark and light browser tabs
    print("Generating multi-resolution favicon.ico...")
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_images = []
    for s_w, s_h in ico_sizes:
        ico_images.append(im_badge_super.resize((s_w, s_h), Image.Resampling.LANCZOS))

    favicon_destinations = [
        r'C:/Users/cashkink/Downloads/balarydex/frontend/public/favicon.ico',
        r'C:/Users/cashkink/Downloads/balarydex/docs/public/favicon.ico',
        r'C:/Users/cashkink/Downloads/balary-favicon.ico',
    ]

    for fpath in favicon_destinations:
        os.makedirs(os.path.dirname(fpath), exist_ok=True)
        ico_images[0].save(
            fpath,
            format='ICO',
            sizes=ico_sizes,
            append_images=ico_images[1:]
        )
        print(f"Saved multi-resolution favicon.ico to {fpath}")

    # Also save path strings to a py file for Logo.tsx generation
    with open('logo_paths.txt', 'w') as f:
        f.write(f"D0={d0_str}\n\nD1={d1_str}\n")
    print("All assets generated successfully!")

if __name__ == '__main__':
    build_assets()
