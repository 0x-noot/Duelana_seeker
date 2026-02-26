"""
Split sprite sheets into individual frame PNGs and upscale 3x with nearest-neighbor.

Detects frame boundaries by scanning for fully-transparent rows (vertical sheets)
or columns (horizontal sheets), then crops and upscales each frame.

Usage: python scripts/split_sprites.py
"""

from PIL import Image
import os

BASE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'app', 'assets', 'sprites', 'web_sprites', 'units'
)
SCALE = 3


def find_frame_boundaries_vertical(img):
    """Find Y boundaries by scanning for fully-transparent rows."""
    w, h = img.size
    pixels = img.load()
    in_frame = False
    boundaries = []
    for y in range(h):
        row_has_content = any(pixels[x, y][3] > 10 for x in range(w))
        if row_has_content and not in_frame:
            boundaries.append({'top': y})
            in_frame = True
        elif not row_has_content and in_frame:
            boundaries[-1]['bottom'] = y
            in_frame = False
    if in_frame:
        boundaries[-1]['bottom'] = h
    return boundaries


def find_frame_boundaries_horizontal(img):
    """Find X boundaries by scanning for fully-transparent columns."""
    w, h = img.size
    pixels = img.load()
    in_frame = False
    boundaries = []
    for x in range(w):
        col_has_content = any(pixels[x, y][3] > 10 for y in range(h))
        if col_has_content and not in_frame:
            boundaries.append({'left': x})
            in_frame = True
        elif not col_has_content and in_frame:
            boundaries[-1]['right'] = x
            in_frame = False
    if in_frame:
        boundaries[-1]['right'] = w
    return boundaries


def split_and_upscale(input_path, output_dir, prefix, orientation, expected_frames):
    img = Image.open(input_path).convert('RGBA')
    os.makedirs(output_dir, exist_ok=True)

    if orientation == 'horizontal':
        bounds = find_frame_boundaries_horizontal(img)
    else:
        bounds = find_frame_boundaries_vertical(img)

    if len(bounds) != expected_frames:
        print(f"  WARNING: Expected {expected_frames} frames, found {len(bounds)} in {input_path}")
        # Fall back to equal division
        if orientation == 'horizontal':
            fw = img.width // expected_frames
            bounds = [{'left': i * fw, 'right': (i + 1) * fw} for i in range(expected_frames)]
        else:
            fh = img.height // expected_frames
            bounds = [{'top': i * fh, 'bottom': (i + 1) * fh} for i in range(expected_frames)]

    for i, b in enumerate(bounds):
        if orientation == 'horizontal':
            frame = img.crop((b['left'], 0, b['right'], img.height))
        else:
            frame = img.crop((0, b['top'], img.width, b['bottom']))

        upscaled = frame.resize(
            (frame.width * SCALE, frame.height * SCALE),
            Image.NEAREST
        )
        out_path = os.path.join(output_dir, f'{prefix}_{i}.png')
        upscaled.save(out_path)
        print(f"  Saved {out_path} ({upscaled.width}x{upscaled.height})")


# Define all sprite sheets to process
SPRITES = [
    # Barbarian
    {
        'character': 'barbarian',
        'file': 'barbarian_idle.png',
        'prefix': 'idle',
        'orientation': 'horizontal',
        'frames': 4,
    },
    {
        'character': 'barbarian',
        'file': 'barbarian_walk_down_sprites.png',
        'prefix': 'walk_down',
        'orientation': 'vertical',
        'frames': 3,
    },
    {
        'character': 'barbarian',
        'file': 'barbarian_attack_down_sprites.png',
        'prefix': 'attack_down',
        'orientation': 'vertical',
        'frames': 3,
    },
    # Berserker
    {
        'character': 'berserker',
        'file': 'berserker_idle.png',
        'prefix': 'idle',
        'orientation': 'horizontal',
        'frames': 4,
    },
    {
        'character': 'berserker',
        'file': 'berserker_walk_up.png',
        'prefix': 'walk_up',
        'orientation': 'vertical',
        'frames': 3,
    },
    {
        'character': 'berserker',
        'file': 'berserker_attack_up.png',
        'prefix': 'attack_up',
        'orientation': 'vertical',
        'frames': 3,
    },
]


def main():
    print(f"Base directory: {BASE_DIR}")
    for spec in SPRITES:
        char_dir = os.path.join(BASE_DIR, spec['character'])
        input_path = os.path.join(char_dir, spec['file'])
        output_dir = os.path.join(char_dir, 'frames')

        if not os.path.exists(input_path):
            print(f"MISSING: {input_path}")
            continue

        print(f"\nProcessing {spec['character']}/{spec['file']}:")
        split_and_upscale(
            input_path, output_dir,
            spec['prefix'], spec['orientation'], spec['frames']
        )

    print("\nDone! All frames generated.")


if __name__ == '__main__':
    main()
