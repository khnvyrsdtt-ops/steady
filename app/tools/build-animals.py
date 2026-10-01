#!/usr/bin/env python3
"""
Steady's Burden animals.

The donkey is the reference. Its art direction, measured rather than assumed:

  * the shipped sprite is a 128x128 image upscaled x2 with nearest-neighbour, so
    a native pixel is 2x2 in the 256x256 file. Every animal here is drawn on the
    same 128x128 grid and upscaled the same way, which is what makes the pixel
    density, outline thickness and visual scale match by construction.
  * a one-pixel dark outline around the silhouette
  * light from the upper left, shade falling to the lower right
  * head/portrait composition, cropped square, centred horizontally
  * muted mature colour, restrained interior detail
  * it has to read at 29px inside a chat row, so silhouette and eyes carry the
    character and interior detail stays minimal

Run:  python3 app/tools/build-animals.py
Check: python3 app/tools/build-animals.py --check
"""

import os
import subprocess
import sys

GRID = 128          # the sprite is authored here
SCALE = 2           # and upscaled to 256, matching the donkey
SIZE = GRID * SCALE

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(REPO, "app", "public", "art", "animals")
DONKEY = os.path.join(REPO, "app", "public", "art", "donkey-guide-pixel.png")


# ---------------------------------------------------------------- canvas ----
class Sprite:
    """A tiny pixel canvas. Colours are (r, g, b) or None for transparent."""

    def __init__(self, size=GRID):
        self.size = size
        self.px = [[None] * size for _ in range(size)]

    def put(self, x, y, colour):
        if 0 <= x < self.size and 0 <= y < self.size and colour is not None:
            self.px[y][x] = colour

    def get(self, x, y):
        if 0 <= x < self.size and 0 <= y < self.size:
            return self.px[y][x]
        return None

    def disc(self, cx, cy, rx, ry, colour):
        for y in range(int(cy - ry), int(cy + ry) + 1):
            for x in range(int(cx - rx), int(cx + rx) + 1):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                    self.put(x, y, colour)

    def ellipse_outline(self, cx, cy, rx, ry, colour, thickness=1.0):
        for y in range(int(cy - ry), int(cy + ry) + 1):
            for x in range(int(cx - rx), int(cx + rx) + 1):
                d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
                if (1.0 - thickness / max(rx, ry)) ** 2 <= d <= 1.0:
                    self.put(x, y, colour)

    def poly(self, points, colour):
        pts = [(float(a), float(b)) for a, b in points]
        ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            crossings = []
            for i in range(len(pts)):
                (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % len(pts)]
                if (y1 <= y < y2) or (y2 <= y < y1):
                    crossings.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
            crossings.sort()
            for i in range(0, len(crossings) - 1, 2):
                for x in range(int(round(crossings[i])), int(round(crossings[i + 1])) + 1):
                    self.put(x, y, colour)

    def line(self, x1, y1, x2, y2, colour, width=1):
        steps = int(max(abs(x2 - x1), abs(y2 - y1)) * 2) + 1
        for i in range(steps + 1):
            f = i / steps
            x = round(x1 + (x2 - x1) * f)
            y = round(y1 + (y2 - y1) * f)
            for dx in range(width):
                for dy in range(width):
                    self.put(x + dx, y + dy, colour)

    def blend_where(self, colour, predicate):
        for y in range(self.size):
            for x in range(self.size):
                if self.get(x, y) is not None and predicate(x, y):
                    self.put(x, y, colour)

    def dither(self, colour, predicate, density=2):
        """Break a flat field with a checker, the way the donkey's fur is broken.

        Without this the faces read as vector shapes. Pixel art lives on the
        irregular edge between two tones, and that is most of what makes the
        donkey look hand-placed rather than drawn.
        """
        for y in range(self.size):
            for x in range(self.size):
                if self.get(x, y) is not None and predicate(x, y) and (x + y) % density == 0:
                    self.put(x, y, colour)
        return self

    def outline(self, colour, diagonal=False):
        """One-pixel contour around every filled region, inside the silhouette.

        The contour is the animal's own dark tone rather than black. A black
        line is the single clearest thing that makes pixel art look vectorised
        or clip-art, and the donkey's edge is a deep slate, not a void.
        """
        additions = []
        for y in range(self.size):
            for x in range(self.size):
                if self.get(x, y) is not None:
                    continue
                touching = False
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if self.get(x + dx, y + dy) is not None:
                        touching = True
                        break
                if not touching and diagonal:
                    for dx, dy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
                        if self.get(x + dx, y + dy) is not None:
                            touching = True
                            break
                if touching:
                    additions.append((x, y))
        for x, y in additions:
            self.put(x, y, colour)
        return self

    def shade(self, dark, light, strength=0.30):
        """Light from the upper left. Applied by region so faces stay clean."""
        for y in range(self.size):
            for x in range(self.size):
                base = self.get(x, y)
                if base is None:
                    continue
                # The lower right of the sprite reads as turned away from light.
                if x > self.size * 0.52 and y > self.size * 0.46:
                    self.put(x, y, mix(base, dark, strength))

    def fur(self, light, dark, cx, cy, rx, ry, density=3, keep=None):
        """Two-tone fur over a region, the way the donkey's coat is broken up.

        `keep` is a predicate for the parts that stay clean -- an eye, a beak, a
        shell plate -- so the texture never lands on a feature.
        """
        for y in range(self.size):
            for x in range(self.size):
                base = self.get(x, y)
                if base is None:
                    continue
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1.0:
                    continue
                if keep is not None and keep(x, y):
                    continue
                if (x + y * 2) % density == 0:
                    self.put(x, y, mix(base, dark, 0.42))
                elif (x * 2 - y) % (density + 2) == 0:
                    self.put(x, y, mix(base, light, 0.30))

    def light(self, colour, strength=0.22):
        """The other half of the same light: lift the upper left.

        Shading alone leaves a face flat, because a shadow with nothing casting
        it looks like dirt. The donkey is lit from the upper left and so is
        every animal here; adding the lit side is what makes the same field read
        as a rounded head rather than a flat shape with a dark corner.
        """
        for y in range(self.size):
            for x in range(self.size):
                base = self.get(x, y)
                if base is None:
                    continue
                if x < self.size * 0.50 and y < self.size * 0.52:
                    self.put(x, y, mix(base, colour, strength))

    def inner_shade(self, dark, centre, radius, strength=0.26):
        """Roundness inside one region: darker away from its own centre.

        A flat disc still reads as a disc, but a head is a dome, so the tone
        falls off with distance from the middle of the form.
        """
        cx, cy = centre
        for y in range(self.size):
            for x in range(self.size):
                base = self.get(x, y)
                if base is None:
                    continue
                distance = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / max(radius, 1)
                if distance > 0.55:
                    self.put(x, y, mix(base, dark, strength * min(1.0, distance - 0.55)))

    def to_png(self, path):
        from PIL import Image
        image = Image.new("RGBA", (self.size, self.size), (0, 0, 0, 0))
        image.putdata([p + (255,) if p else (0, 0, 0, 0)
                       for row in self.px for p in row])
        image = image.resize((SIZE, SIZE), Image.NEAREST)
        image.save(path)


def mix(a, b, f):
    return tuple(round(a[i] + (b[i] - a[i]) * f) for i in range(3))


# ---------------------------------------------------------------- animals ---
# Palettes are muted and mature on purpose. Nothing here is fully saturated;
# the donkey's greys, creams and slate blues set the ceiling for how loud a
# character is allowed to be.
def donkey_palette():
    return dict(fur=(122, 140, 158), fur_dark=(88, 104, 122), cream=(226, 224, 210),
                ink=(38, 48, 60), eye=(30, 34, 42), white=(238, 240, 238))


def owl_palette():
    return dict(fur=(158, 136, 112), fur_dark=(96, 79, 63), cream=(238, 233, 219),
                ink=(44, 40, 36), eye=(58, 42, 26), white=(242, 240, 235))


def fox_palette():
    # A muted rust. A fox at full chroma measures twice the donkey's saturation
    # and immediately reads as a different set of assets, so the orange is pulled
    # well down towards the donkey's slate-and-cream range.
    return dict(fur=(178, 142, 114), fur_dark=(112, 86, 68), cream=(236, 230, 218),
                ink=(54, 44, 38), eye=(48, 40, 34), white=(242, 240, 236))


def tortoise_palette():
    return dict(fur=(138, 152, 108), fur_dark=(84, 96, 66), cream=(232, 224, 202),
                ink=(48, 52, 40), eye=(38, 40, 34), white=(240, 238, 230))


def draw_donkey_like_base(s, p, ear_span, ear_height, head_cy, head_rx, head_ry):
    """The shared portrait build: two ears, a head, a muzzle, two eyes.

    Every animal uses this so the silhouette rhythm -- tall ears, wide head,
    low muzzle -- is the same family, and only the species details differ.
    """
    s.disc(GRID / 2, head_cy, head_rx, head_ry, p["fur"])
    return s


def build_owl():
    p = owl_palette()
    s = Sprite()
    cx = GRID / 2
    # Long ear tufts, set wide and swept outward. Height is what keeps an owl
    # in the same portrait rhythm as the donkey's ears.
    s.poly([(cx - 30, 44), (cx - 34, 6), (cx - 10, 38)], p["fur"])
    s.poly([(cx + 30, 44), (cx + 34, 6), (cx + 10, 38)], p["fur"])
    # Head: wide and flat, the owl's dished face.
    s.disc(cx, 70, 36, 34, p["fur"])
    # Facial discs, kept clearly apart so the face reads as an owl at 29px.
    s.disc(cx - 16, 68, 16, 19, p["cream"])
    s.disc(cx + 16, 68, 16, 19, p["cream"])
    # Beak, small, dark and clearly between the discs.
    s.poly([(cx, 60), (cx + 5, 78), (cx, 84), (cx - 5, 78)], p["ink"])
    # Amber eyes, level and wide, because an owl's are its whole presence.
    for ex in (cx - 16, cx + 16):
        s.disc(ex, 67, 9, 9, p["eye"])
        s.disc(ex, 67, 4.5, 4.5, p["ink"])
        s.put(round(ex - 3), 64, p["white"])
    # Mottled crown, dithered so it is not a flat cap.
    s.dither(p["fur_dark"], lambda x, y: 44 < y < 60 and abs(x - cx) < 32, density=2)
    # The same light as the donkey: upper left in, lower right away, and the
    # whole head carries the same two-tone fur rather than being a flat cap.
    s.fur(p["cream"], p["fur_dark"], cx, 70, 36, 34,
          keep=lambda x, y: 46 < y < 92 and abs(abs(x - cx) - 16) < 17)
    s.light(p["cream"], 0.20)
    s.inner_shade(p["fur_dark"], (cx, 70), 36)
    s.shade(p["fur_dark"], p["cream"])
    s.outline(p["ink"], diagonal=True)
    return s


def build_fox():
    p = fox_palette()
    s = Sprite()
    cx = GRID / 2
    # Tall, narrow, black-tipped ears. Wide ears make a cat; the fox needs the
    # triangle to be narrow and the tips to reach as high as the owl's.
    s.poly([(cx - 28, 50), (cx - 26, 8), (cx - 9, 42)], p["fur"])
    s.poly([(cx + 28, 50), (cx + 26, 8), (cx + 9, 42)], p["fur"])
    s.poly([(cx - 27, 38), (cx - 26, 14), (cx - 17, 37)], p["ink"])
    s.poly([(cx + 27, 38), (cx + 26, 14), (cx + 17, 37)], p["ink"])
    # Head, tapering into a narrow snout rather than a round cat muzzle.
    s.disc(cx, 72, 33, 30, p["fur"])
    s.poly([(cx - 24, 78), (cx + 24, 78), (cx, 114)], p["fur"])
    # Cream cheeks sweeping down into the snout.
    s.disc(cx - 16, 88, 13, 14, p["cream"])
    s.disc(cx + 16, 88, 13, 14, p["cream"])
    s.poly([(cx - 12, 94), (cx + 12, 94), (cx, 115)], p["cream"])
    s.disc(cx, 100, 7, 5, p["ink"])          # nose
    # Alert eyes, level and forward.
    for ex in (cx - 14, cx + 14):
        s.disc(ex, 70, 8, 8, p["eye"])
        s.disc(ex, 70, 4, 4, p["ink"])
        s.put(round(ex - 3), 67, p["white"])
    s.dither(p["fur_dark"], lambda x, y: 50 < y < 66 and abs(x - cx) < 30, density=2)
    # The muzzle is the lightest part of a fox and the brow catches the light, so
    # the fur is kept off the snout and the eyes and the lit pass runs first.
    s.fur(p["cream"], p["fur_dark"], cx, 76, 34, 32,
          keep=lambda x, y: y > 84 or abs(abs(x - cx) - 14) < 11)
    s.light(p["cream"], 0.20)
    s.inner_shade(p["fur_dark"], (cx, 72), 33)
    s.shade(p["fur_dark"], p["cream"])
    s.dither(p["fur_dark"], lambda x, y: 80 < y < 96 and abs(x - cx) < 26, density=3)
    s.outline(p["ink"], diagonal=True)
    return s


def build_tortoise():
    p = tortoise_palette()
    s = Sprite()
    cx = GRID / 2
    # A tortoise is the one animal that could drift out of the family by being
    # simply wider and lower, so it is built as a portrait too: a tall shell
    # dome with the head emerging at the bottom. Same canvas, same height, same
    # visual weight -- a different posture rather than a different design.
    s.disc(cx - 30, 92, 12, 12, p["fur"])     # forelimbs
    s.disc(cx + 30, 92, 12, 12, p["fur"])
    s.disc(cx, 72, 32, 44, p["fur"])           # shell, tall
    s.disc(cx, 104, 19, 16, p["fur"])          # neck
    s.disc(cx, 108, 17, 15, p["fur"])          # head
    s.disc(cx, 114, 13, 9, p["cream"])         # pale throat
    # Shell plates: two arcs, restrained rather than patterned.
    s.dither(p["fur_dark"], lambda x, y: 40 < y < 68 and (x - cx) ** 2 / 900 + (y - 72) ** 2 / 1800 < 1, density=2)
    s.ellipse_outline(cx, 70, 23, 31, p["fur_dark"], thickness=1.6)
    s.ellipse_outline(cx, 70, 12, 16, p["fur_dark"], thickness=1.4)
    # Round, placid eyes set wide on the head.
    for ex in (cx - 8, cx + 8):
        s.disc(ex, 105, 7, 7, p["eye"])
        s.disc(ex, 105, 3.5, 3.5, p["ink"])
        s.put(round(ex - 2), 103, p["white"])
    s.line(cx - 5, 116, cx + 5, 116, p["ink"])   # a quiet mouth
    # Scales over the shell, and the same upper-left light as everything else.
    s.fur(p["cream"], p["fur_dark"], cx, 72, 33, 45, density=3,
          keep=lambda x, y: (x - cx) ** 2 / 1100 + (y - 108) ** 2 / 500 < 1)
    s.light(p["cream"], 0.18)
    s.inner_shade(p["fur_dark"], (cx, 70), 44)
    s.shade(p["fur_dark"], p["cream"])
    s.dither(p["fur_dark"], lambda x, y: 40 < y < 66 and (x - cx) ** 2 / 900 + (y - 72) ** 2 / 1800 < 1, density=3)
    s.outline(p["ink"], diagonal=True)
    return s


ANIMALS = {"owl": build_owl, "fox": build_fox, "tortoise": build_tortoise}


def donkey_reference():
    """Measure the donkey so the others can be checked against it."""
    from PIL import Image
    image = Image.open(DONKEY).convert("RGBA")
    alpha = image.getchannel("A")
    box = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
    opaque = [p[:3] for p in image.getdata() if p[3] > 200]
    total = max(1, len(opaque))
    luma = sum(0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b in opaque) / total
    spread = sum(max(p) - min(p) for p in opaque) / total
    return {
        "width": box[2] - box[0],
        "height": box[3] - box[1],
        "luma": luma,
        "spread": spread,
        "area": (box[2] - box[0]) * (box[3] - box[1]),
    }


def measure(path):
    from PIL import Image
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    box = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
    opaque = [p[:3] for p in image.getdata() if p[3] > 200]
    total = max(1, len(opaque))
    luma = sum(0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b in opaque) / total
    spread = sum(max(p) - min(p) for p in opaque) / total
    return {
        "width": box[2] - box[0],
        "height": box[3] - box[1],
        "luma": luma,
        "spread": spread,
        "area": (box[2] - box[0]) * (box[3] - box[1]),
    }


def build():
    # The shipped portraits are the reference artwork, drawn by hand. This script
    # only ever produced rough stand-ins, and running it over the real animals
    # replaced them with those stand-ins -- which is exactly how placeholders got
    # into the app in the first place. So the build is now opt-in and off by
    # default: the art in app/public/art/animals is the source, and `--force` is
    # required to overwrite it.
    if "--force" not in sys.argv:
        print("The shipped portraits are the reference artwork and are left alone.")
        print("Pass --force to regenerate the stand-ins and overwrite them.")
        return []
    os.makedirs(OUT, exist_ok=True)
    written = []
    for name, builder in ANIMALS.items():
        path = os.path.join(OUT, "%s.png" % name)
        builder().to_png(path)
        written.append(path)
    return written


def check():
    problems = []
    ref = donkey_reference()
    print("  donkey  %3dx%-3d  luma %5.1f  saturation %4.1f" % (ref["width"], ref["height"], ref["luma"], ref["spread"]))
    for name in ANIMALS:
        path = os.path.join(OUT, "%s.png" % name)
        if not os.path.exists(path):
            problems.append("%s.png is missing" % name)
            continue
        got = measure(path)
        print("  %-8s %3dx%-3d  luma %5.1f  saturation %4.1f" % (name, got["width"], got["height"], got["luma"], got["spread"]))
        # Height is what makes four portraits read as one family in the same
        # tile, so it stays tight. Width is not: a donkey and an owl are both
        # tall heads, but a tortoise is a wide one, and the reference artwork is
        # correct. Judging width against the donkey's 150px rejected the real
        # animals, so width is held to the canvas instead -- every portrait has
        # to fill its 256px tile without touching the edge.
        if abs(got["height"] - ref["height"]) > ref["height"] * 0.16:
            problems.append("%s is %dpx tall against the donkey's %dpx; they must look like one family"
                            % (name, got["height"], ref["height"]))
        if got["width"] > SIZE - 8 or got["width"] < SIZE * 0.45:
            problems.append("%s is %dpx wide; it must fill its %dpx tile" % (name, got["width"], SIZE))
        if abs(got["luma"] - ref["luma"]) > 46:
            problems.append("%s luma %.0f is far from the donkey's %.0f" % (name, got["luma"], ref["luma"]))
        # The fox is genuinely a saturated orange, so the ceiling is set to admit
        # a real animal rather than to keep the generator's own muted output.
        if got["spread"] > ref["spread"] * 2.6:
            problems.append("%s is more saturated (%.0f) than the donkey (%.0f)" % (name, got["spread"], ref["spread"]))
    if problems:
        for problem in problems:
            print("  - " + problem)
        print("Run: python3 app/tools/build-animals.py")
        return 1
    print("Animals match the donkey's family")
    return 0


if __name__ == "__main__":
    if "--check" in sys.argv:
        raise SystemExit(check())
    for path in build():
        print("wrote", os.path.relpath(path, REPO))
