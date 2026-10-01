#!/usr/bin/env python3
"""Build Steady Arc's custom Home Screen mark in every iOS appearance."""

import os
import sys
from math import asin, atan2, comb, cos, hypot, pi, sin
from PIL import Image, ImageChops, ImageDraw, ImageFilter

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PRIMARY = os.path.join(REPO, "ios/Steady/Assets.xcassets/AppIcon.appiconset")
ALTERNATE = os.path.join(REPO, "ios/Steady/Assets.xcassets/AppIconCleanGlass.appiconset")
BRAND = os.path.join(REPO, "app/public/brand")
EXPO = os.path.join(REPO, "expo")
SIZE = 1024
SCALE = 8
WEB_SIZES = (16, 32, 48, 64, 120, 152, 167, 180, 192, 512, 1024)


def artwork(vector=False):
    """Offset an analytic curve for even edges, matched bowls and a straight spine."""
    rx, ry, height, radius = 180.0, 130.0, 172.0, 52.0
    tangent_angle = -(pi + asin(ry / height))

    def ellipse(angle):
        x, y = rx * cos(angle), -height + ry * sin(angle)
        vx, vy = rx * sin(angle), -ry * cos(angle)
        speed = hypot(vx, vy)
        return x, y, vx/speed, vy/speed, -rx*ry/speed**3

    def bezier(points, t):
        degree = len(points) - 1
        return tuple(sum(comb(degree, j) * (1-t)**(degree-j) * t**j * p[axis]
                         for j, p in enumerate(points)) for axis in (0, 1))

    # Ease the ellipse's curvature to zero before the straight middle. The
    # two end tangents and curvatures match, without a reverse bend or pinch.
    lead_angle, extension = 0.26, 16.0
    start, contact = ellipse(tangent_angle + lead_angle), ellipse(tangent_angle)
    end = tuple(contact[i] + extension * contact[i+2] for i in (0, 1))
    length = hypot(start[0]-contact[0], start[1]-contact[1]) + extension
    start_speed, end_speed = length * 1.08, length * 0.96
    p0 = start[:2]
    p1 = tuple(p0[i] + start_speed * start[i+2] / 5 for i in (0, 1))
    normal = (-start[3], start[2])
    p2 = tuple(2*p1[i] - p0[i] + start[4]*normal[i]*start_speed**2/20 for i in (0, 1))
    p4 = tuple(end[i] - end_speed * contact[i+2] / 5 for i in (0, 1))
    p3 = tuple(2*p4[i] - end[i] for i in (0, 1))
    controls = (p0, p1, p2, p3, p4, end)
    derivatives = [tuple(5*(b[i]-a[i]) for i in (0, 1))
                   for a, b in zip(controls, controls[1:])]

    upper = []
    start_angle = -0.20
    for step in range(1201):
        angle = start_angle + (tangent_angle + lead_angle - start_angle) * step / 1200
        upper.append(ellipse(angle)[:4])
    for step in range(1, 201):
        t = step / 200
        point, velocity = bezier(controls, t), bezier(derivatives, t)
        speed = hypot(*velocity)
        upper.append((*point, velocity[0]/speed, velocity[1]/speed))
    upper.append((0.0, 0.0, contact[2], contact[3]))
    path = upper + [(-x, -y, tx, ty) for x, y, tx, ty in reversed(upper[:-1])]
    left = [(x-ty*radius, y+tx*radius) for x, y, tx, ty in path]
    right = [(x+ty*radius, y-tx*radius) for x, y, tx, ty in path]

    def cap(sample, offset):
        x, y, tx, ty = sample
        angle = atan2(ty, tx)
        return [(x+radius*cos(angle+offset-pi*i/128),
                 y+radius*sin(angle+offset-pi*i/128)) for i in range(1, 128)]

    outline = left + cap(path[-1], pi/2) + list(reversed(right)) + cap(path[0], -pi/2)
    mark_scale = 1.05
    if vector:
        return [(x*mark_scale+SIZE/2, y*mark_scale+SIZE/2) for x, y in outline]
    coords = [((x*mark_scale+SIZE/2)*SCALE-0.5,
               (y*mark_scale+SIZE/2)*SCALE-0.5) for x, y in outline]
    mask = Image.new("L", (SIZE*SCALE, SIZE*SCALE), 0)
    ImageDraw.Draw(mask).polygon(coords, fill=255)
    mask = mask.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    return Image.blend(mask, mask.rotate(180), 0.5)


def build(mask):
    """A cool light tile with soft edge shading and a crisp, shallow glass mark."""
    image = Image.new("RGB", (SIZE, SIZE))
    pixels = image.load()
    midpoint = (SIZE - 1) / 2
    # Full-bleed colour: iOS supplies the icon's outer mask. The broad edge
    # shading adds depth without baking in a border or rounded rectangle.
    for y in range(SIZE):
        for x in range(SIZE):
            nx, ny = (x-midpoint)/midpoint, (y-midpoint)/midpoint
            radius = min(1.0, (abs(nx)**5 + abs(ny)**5)**0.2)
            edge = max(0.0, (radius-0.45)/0.55)**2
            t = min(1.0, edge*0.8 + (ny+1)*0.10)
            pixels[x, y] = tuple(round(a*(1-t) + b*t)
                                 for a, b in zip((248, 250, 255), (216, 226, 242)))
    halo = mask.filter(ImageFilter.GaussianBlur(10)).point(lambda a: round(a * 0.13))
    image.paste((22, 32, 56), (0, 0), halo)
    fill = Image.new("RGB", (SIZE, SIZE))
    draw = ImageDraw.Draw(fill)
    center = (46, 84, 191)
    end = (39, 68, 158)
    for y in range(SIZE):
        t = min(1.0, abs(y - (SIZE-1)/2) / 380)
        colour = tuple(round(center[i]*(1-t) + end[i]*t) for i in range(3))
        draw.line((0, y, SIZE, y), fill=colour)
    image.paste(fill, (0, 0), mask)
    bevel = ImageChops.subtract(mask, mask.filter(ImageFilter.GaussianBlur(4)))
    rim = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(5)))
    image.paste((16, 35, 83), (0, 0), bevel.point(lambda a: round(a * 0.20)))
    image.paste((160, 186, 242), (0, 0), rim.point(lambda a: round(a * 0.18)))
    return image


def build_tinted(mask):
    image = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
    image.putalpha(mask)
    return image


def outputs():
    mask = artwork()
    standard = build(mask)
    tinted = build_tinted(mask)
    return {
        os.path.join(PRIMARY, "AppIcon.png"): standard,
        os.path.join(PRIMARY, "AppIcon-dark.png"): standard,
        os.path.join(PRIMARY, "AppIcon-tinted.png"): tinted,
        os.path.join(ALTERNATE, "AppIcon.png"): standard,
        os.path.join(ALTERNATE, "AppIcon-dark.png"): standard,
        os.path.join(ALTERNATE, "AppIcon-tinted.png"): tinted,
    }, standard


def same_image(path, expected):
    if not os.path.exists(path):
        return False
    actual = Image.open(path)
    return actual.mode == expected.mode and actual.size == expected.size and \
        ImageChops.difference(actual, expected).getbbox() is None


def main():
    icons, standard = outputs()
    if "--check" in sys.argv:
        stale = [os.path.relpath(path, REPO) for path, image in icons.items()
                 if not same_image(path, image)]
        if stale:
            for path in stale:
                print("out of date:", path)
            return 1
        print("Home Screen icon is current")
        return 0
    for path, image in icons.items():
        os.makedirs(os.path.dirname(path), exist_ok=True)
        image.save(path)
        print("wrote", os.path.relpath(path, REPO))
    if "--web" in sys.argv:
        for size in WEB_SIZES:
            image = standard.resize((size, size), Image.Resampling.LANCZOS)
            path = os.path.join(BRAND, f"app-icon-v2-{size}.png")
            image.save(path)
            print("wrote", os.path.relpath(path, REPO))
        standard.resize((48, 48), Image.Resampling.LANCZOS).save(
            os.path.join(BRAND, "favicon-v2.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
        for path in (os.path.join(EXPO, "assets/icon.png"),
                     os.path.join(EXPO, "ios/Steady/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png")):
            standard.save(path)
            print("wrote", os.path.relpath(path, REPO))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
