import math
import os
import shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_og_image(
    output_path,
    title="Balary",
    subtitle="The Premier Decentralized Exchange on LitVM",
    badge_text="LITVM ECOSYSTEM",
    url_text="balary.lol",
    feature_tags=["Minimal Latency", "Concentrated Liquidity", "Uniswap v4 Hooks", "Season Rewards"]
):
    W, H = 1200, 630
    im = Image.new('RGBA', (W, H), (9, 9, 11, 255))
    draw = ImageDraw.Draw(im)

    # 1. Background radial glow
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    
    # Soft warm amber aura radiating from upper-middle
    cx, cy = 600, 240
    max_r = 460
    for r in range(max_r, 0, -10):
        alpha = int(28 * (1 - r / max_r)**1.8)
        glow_draw.ellipse(
            [(cx - r, cy - int(r * 0.7)), (cx + r, cy + int(r * 0.7))],
            fill=(245, 158, 11, alpha)
        )
    glow = glow.filter(ImageFilter.GaussianBlur(40))
    im = Image.alpha_composite(im, glow)
    draw = ImageDraw.Draw(im)

    # 2. Subtle background dot matrix
    for gx in range(40, W, 40):
        for gy in range(40, H, 40):
            dist = math.hypot(gx - cx, gy - cy)
            if dist > 170:
                draw.ellipse([(gx - 1, gy - 1), (gx + 1, gy + 1)], fill=(255, 255, 255, 12))

    # 3. Outer border frame
    draw.rounded_rectangle(
        [(24, 24), (W - 24, H - 24)],
        radius=28,
        outline=(255, 255, 255, 18),
        width=1
    )

    # 4. Fonts
    fonts_dir = r'C:\Windows\Fonts'
    font_bold = os.path.join(fonts_dir, 'segoeuib.ttf')
    font_reg = os.path.join(fonts_dir, 'segoeui.ttf')

    try:
        f_title = ImageFont.truetype(font_bold, 74 if len(title) <= 8 else 60)
        f_sub = ImageFont.truetype(font_reg, 26)
        f_badge = ImageFont.truetype(font_bold, 14)
        f_tags = ImageFont.truetype(font_reg, 16)
        f_url = ImageFont.truetype(font_bold, 17)
    except Exception:
        f_title = ImageFont.load_default()
        f_sub = ImageFont.load_default()
        f_badge = ImageFont.load_default()
        f_tags = ImageFont.load_default()
        f_url = ImageFont.load_default()

    # 5. Top pill badge
    tb_badge = draw.textbbox((0, 0), badge_text, font=f_badge)
    badge_w = (tb_badge[2] - tb_badge[0]) + 52
    badge_h = 36
    badge_x = (W - badge_w) // 2
    badge_y = 65
    draw.rounded_rectangle(
        [(badge_x, badge_y), (badge_x + badge_w, badge_y + badge_h)],
        radius=18,
        fill=(24, 24, 27, 220),
        outline=(63, 63, 70, 200),
        width=1
    )
    # Emerald status dot
    dot_x, dot_y = badge_x + 18, badge_y + 18
    draw.ellipse([(dot_x - 4, dot_y - 4), (dot_x + 4, dot_y + 4)], fill=(16, 185, 129, 255))
    draw.text((badge_x + 32, badge_y + 8), badge_text, font=f_badge, fill=(228, 228, 231, 255))

    # 6. Center Logo Icon Badge
    badge_size = 130
    logo_bx = (W - badge_size) // 2
    logo_by = 125
    draw.rounded_rectangle(
        [(logo_bx, logo_by), (logo_bx + badge_size, logo_by + badge_size)],
        radius=30,
        fill=(18, 18, 20, 255),
        outline=(60, 60, 68, 255),
        width=2
    )

    # Render exact Balary Logo inside badge
    logo_img_path = r'C:/Users/cashkink/Downloads/balarydex/frontend/public/balary-logo-white.png'
    if os.path.exists(logo_img_path):
        logo_png = Image.open(logo_img_path).convert('RGBA')
        glyph_size = int(badge_size * 0.65)
        logo_resized = logo_png.resize((glyph_size, glyph_size), Image.Resampling.LANCZOS)
        glyph_x = logo_bx + (badge_size - glyph_size) // 2
        glyph_y = logo_by + (badge_size - glyph_size) // 2
        im.paste(logo_resized, (glyph_x, glyph_y), logo_resized)

    # 7. Brand Title
    bbox_t = draw.textbbox((0, 0), title, font=f_title)
    tw = bbox_t[2] - bbox_t[0]
    title_y = 282 if len(title) <= 8 else 292
    draw.text(((W - tw) // 2, title_y), title, font=f_title, fill=(255, 255, 255, 255))

    # 8. Subtitle
    bbox_s = draw.textbbox((0, 0), subtitle, font=f_sub)
    sw = bbox_s[2] - bbox_s[0]
    draw.text(((W - sw) // 2, 380), subtitle, font=f_sub, fill=(161, 161, 170, 255))

    # 9. Feature Tags Row
    tag_pills = feature_tags
    tag_y = 445
    pill_widths = []
    for tag in tag_pills:
        tb = draw.textbbox((0, 0), tag, font=f_tags)
        pill_widths.append((tb[2] - tb[0]) + 32)
    
    gap = 14
    total_w = sum(pill_widths) + gap * (len(pill_widths) - 1)
    start_x = (W - total_w) // 2

    curr_x = start_x
    for i, tag in enumerate(tag_pills):
        pw = pill_widths[i]
        draw.rounded_rectangle(
            [(curr_x, tag_y), (curr_x + pw, tag_y + 36)],
            radius=18,
            fill=(24, 24, 27, 200),
            outline=(39, 39, 42, 255),
            width=1
        )
        tb = draw.textbbox((0, 0), tag, font=f_tags)
        tw_tag = tb[2] - tb[0]
        draw.text((curr_x + (pw - tw_tag) // 2, tag_y + 7), tag, font=f_tags, fill=(212, 212, 216, 255))
        curr_x += pw + gap

    # 10. Footer URL & Network
    bbox_u = draw.textbbox((0, 0), url_text, font=f_url)
    uw = bbox_u[2] - bbox_u[0]
    draw.text(((W - uw) // 2, 535), url_text, font=f_url, fill=(113, 113, 122, 255))

    # Save PNG and JPG
    dir_name = os.path.dirname(output_path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    im_rgb = im.convert('RGB')
    im.save(output_path, format='PNG', optimize=True)
    
    jpg_path = output_path.replace('.png', '.jpg')
    im_rgb.save(jpg_path, format='JPEG', quality=95, optimize=True)
    print(f"Generated OG Image: {output_path} and {jpg_path}")

def generate_all():
    # 1. Main DEX OG Image
    dex_og = r'C:/Users/cashkink/Downloads/balarydex/frontend/public/og.png'
    create_og_image(
        dex_og,
        title="Balary",
        subtitle="The Premier Decentralized Exchange on LitVM",
        badge_text="LITVM ECOSYSTEM",
        url_text="balary.lol",
        feature_tags=["Minimal Latency", "Concentrated Liquidity", "Uniswap v4 Hooks", "Season Rewards"]
    )
    
    # Copy to Downloads
    shutil.copyfile(dex_og, r'C:/Users/cashkink/Downloads/balary-og.png')
    shutil.copyfile(dex_og.replace('.png', '.jpg'), r'C:/Users/cashkink/Downloads/balary-og.jpg')

    # 2. Docs OG Image
    docs_og = r'C:/Users/cashkink/Downloads/balarydex/docs/public/og.png'
    create_og_image(
        docs_og,
        title="Balary Documentation",
        subtitle="Uniswap v4 Architecture, Contracts & Hooks SDK",
        badge_text="LITVM DEVELOPER DOCS",
        url_text="docs.balary.lol",
        feature_tags=["Smart Contracts", "Uniswap v4 Hooks", "TypeScript SDK", "Protocol Specs"]
    )

    # Copy to Downloads
    shutil.copyfile(docs_og, r'C:/Users/cashkink/Downloads/balary-docs-og.png')
    shutil.copyfile(docs_og.replace('.png', '.jpg'), r'C:/Users/cashkink/Downloads/balary-docs-og.jpg')

    print("All OG images created successfully!")

if __name__ == '__main__':
    generate_all()
