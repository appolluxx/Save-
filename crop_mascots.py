from PIL import Image
import os

img_path = os.path.join("apps", "web", "public", "assets", "figma", "pixel-mascots.png")
if os.path.exists(img_path):
    im = Image.open(img_path)
    w, h = im.size
    print(f"Original size: {w}x{h}")
    # Left half: student
    student = im.crop((0, 0, w // 2, h))
    student.save(os.path.join("apps", "web", "public", "assets", "figma", "pixel-student.png"))
    print("Saved pixel-student.png")

    # Right half: teacher
    teacher = im.crop((w // 2, 0, w, h))
    teacher.save(os.path.join("apps", "web", "public", "assets", "figma", "pixel-teacher.png"))
    print("Saved pixel-teacher.png")
else:
    print("pixel-mascots.png not found")
