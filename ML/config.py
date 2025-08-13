import os
import requests
from PIL import ImageFont
import cloudinary

# ==== ✅ Cloudinary Config ====
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# ==== ✅ Design Config ====
class DesignConfig:
    COLOR_SCHEMES = {
        "professional": {
            "background": (25, 32, 45),
            "primary": (0, 150, 255),
            "secondary": (240, 240, 240),
            "accent": (255, 200, 0)
        }
    }
    CURRENT_SCHEME = "professional"

    FONT_FILES = {
        "TITLE_FONT": ("Roboto-Bold.ttf", "https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Bold.ttf"),
        "SUBTITLE_FONT": ("Roboto-Medium.ttf", "https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Medium.ttf"),
        "BODY_FONT": ("Roboto-Regular.ttf", "https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Regular.ttf")
    }

    # Download fonts if not found
    for fname, url in FONT_FILES.values():
        if not os.path.exists(fname):
            try:
                r = requests.get(url)
                r.raise_for_status()
                with open(fname, "wb") as f:
                    f.write(r.content)
            except Exception as e:
                print(f"[WARN] Could not download font {fname}: {e}")

    # Load fonts (fallback to default)
    try:
        TITLE_FONT = ImageFont.truetype(FONT_FILES["TITLE_FONT"][0], 80)
        SUBTITLE_FONT = ImageFont.truetype(FONT_FILES["SUBTITLE_FONT"][0], 60)
        BODY_FONT = ImageFont.truetype(FONT_FILES["BODY_FONT"][0], 48)
    except Exception as e:
        print(f"[WARN] Falling back to default fonts: {e}")
        TITLE_FONT = ImageFont.load_default()
        SUBTITLE_FONT = ImageFont.load_default()
        BODY_FONT = ImageFont.load_default()

    # PDF font settings
    PDF_TITLE_FONT = "Helvetica-Bold"
    PDF_TITLE_SIZE = 18
    PDF_BODY_FONT = "Helvetica"
    PDF_BODY_SIZE = 11
