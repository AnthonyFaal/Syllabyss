import os
import textwrap
import tempfile
import shutil
from datetime import datetime
from typing import Literal
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image, ImageDraw, ImageFont
from gtts import gTTS
from moviepy.editor import ImageClip, concatenate_videoclips, AudioFileClip
from moviepy.video.fx.all import fadein, fadeout
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

# ==========================
# ✅ Load .env
# ==========================
load_dotenv()

# ✅ Cloudinary Config
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

app = FastAPI(title="Tutorial Generator API", description="Creates video or PDF from tutorial content")

class TutorialRequest(BaseModel):
    title: str
    content: str
    output_format: Literal["video", "pdf"]

# ==========================
# ✅ Design Configuration
# ==========================
class DesignConfig:
    COLOR_SCHEMES = {
        "professional": {
            "background": (25, 32, 45),
            "primary": (0, 150, 255),
            "secondary": (240, 240, 240),
            "accent": (255, 200, 0),
        }
    }
    CURRENT_SCHEME = "professional"

    try:
        TITLE_FONT = ImageFont.truetype("Roboto-Bold.ttf", 80)
        SUBTITLE_FONT = ImageFont.truetype("Roboto-Medium.ttf", 60)
        BODY_FONT = ImageFont.truetype("Roboto-Regular.ttf", 48)
    except:
        TITLE_FONT = ImageFont.load_default()
        SUBTITLE_FONT = ImageFont.load_default()
        BODY_FONT = ImageFont.load_default()

    PDF_TITLE_FONT = "Helvetica-Bold"
    PDF_BODY_FONT = "Helvetica"
    PDF_TITLE_SIZE = 24
    PDF_BODY_SIZE = 14


# ==========================
# ✅ Slide Generator
# ==========================
def generate_slide(args):
    i, slide_text, title_text, is_title_slide = args
    colors = DesignConfig.COLOR_SCHEMES[DesignConfig.CURRENT_SCHEME]
    img = Image.new("RGB", (1920, 1080), color=colors["background"])
    draw = ImageDraw.Draw(img)

    if is_title_slide:
        title_bbox = draw.textbbox((0, 0), title_text, font=DesignConfig.TITLE_FONT)
        title_width = title_bbox[2] - title_bbox[0]
        draw.text(((1920 - title_width) // 2, 300), title_text, fill=colors["primary"], font=DesignConfig.TITLE_FONT)

        date_text = "Created on " + datetime.now().strftime("%B %d, %Y")
        date_bbox = draw.textbbox((0, 0), date_text, font=DesignConfig.SUBTITLE_FONT)
        date_width = date_bbox[2] - date_bbox[0]
        draw.text(((1920 - date_width) // 2, 420), date_text, fill=colors["secondary"], font=DesignConfig.SUBTITLE_FONT)

        line_length = max(title_width, date_width) + 100
        draw.line([((1920 - line_length) // 2, 500), ((1920 + line_length) // 2, 500)], fill=colors["accent"], width=4)

    else:
        draw.text((1800, 100), f"{i}", fill=colors["secondary"], font=DesignConfig.SUBTITLE_FONT)

        title_bbox = draw.textbbox((0, 0), title_text, font=DesignConfig.SUBTITLE_FONT)
        title_width = title_bbox[2] - title_bbox[0]
        draw.text(((1920 - title_width) // 2, 100), title_text, fill=colors["primary"], font=DesignConfig.SUBTITLE_FONT)

        y_offset = 200
        for line in textwrap.wrap(slide_text, width=50): 
            line_bbox = draw.textbbox((0, 0), line, font=DesignConfig.BODY_FONT)
            line_width = line_bbox[2] - line_bbox[0]
            draw.text(((1920 - line_width) // 2, y_offset), line, fill=colors["secondary"], font=DesignConfig.BODY_FONT)
            y_offset += line_bbox[3] - line_bbox[1] + 20
    return img


# ==========================
# ✅ Video Generation
# ==========================
def generate_video_content(title: str, content: str):
    temp_dir = tempfile.mkdtemp()
    os.chdir(temp_dir)

    try:
        slides = [slide.strip() for slide in content.split("\n\n") if slide.strip()]
        slide_files = []
        text_lengths = []
        texts = []
        title_slide = generate_slide((0, "", title, True))
        title_slide_path = "slide_0.png"
        title_slide.save(title_slide_path)
        slide_files.append(title_slide_path)
        texts.append(title)
        text_lengths.append(len(title))

        for i, slide in enumerate(slides):
            slide_img = generate_slide((i + 1, slide, title, False))
            path = f"slide_{i + 1}.png"
            slide_img.save(path)
            slide_files.append(path)
            texts.append(slide)
            text_lengths.append(len(slide))

        tts = gTTS(text=f"{title}. {' '.join(slides)}", lang="en", tld="co.uk")
        audio_path = "voiceover.mp3"
        tts.save(audio_path)
        audio_clip = AudioFileClip(audio_path)

        total_audio_duration = audio_clip.duration
        total_char_count = sum(text_lengths)

        durations = [(count / total_char_count) * total_audio_duration for count in text_lengths]

        video_clips = []
        for path, duration in zip(slide_files, durations):
            video_clips.append(ImageClip(path).set_duration(duration))

        final_video = concatenate_videoclips(video_clips).set_audio(audio_clip)
        final_video.write_videofile("tutorial.mp4", fps=24, threads=4, preset="ultrafast")

        url = cloudinary.uploader.upload("tutorial.mp4", resource_type="video", folder="tutorials")["secure_url"]

        return {"url": url, "type": "video"}
    finally:
        os.chdir("/content") if os.getcwd().startswith("/content") else None
        shutil.rmtree(temp_dir, ignore_errors=True)


# ==========================
# ✅ PDF Generation
# ==========================
def generate_pdf_content(title: str, content: str):
    temp_dir = tempfile.mkdtemp()
    os.chdir(temp_dir)

    try:
        styles = getSampleStyleSheet()
        if "CustomTitle" not in styles:
            styles.add(
                ParagraphStyle(
                    name="CustomTitle",
                    alignment=TA_CENTER,
                    fontName=DesignConfig.PDF_TITLE_FONT,
                    fontSize=DesignConfig.PDF_TITLE_SIZE,
                    textColor=colors.blue,
                )
            )
        if "CustomBody" not in styles:
            styles.add(
                ParagraphStyle(
                    name="CustomBody",
                    alignment=TA_JUSTIFY,
                    fontName=DesignConfig.PDF_BODY_FONT,
                    fontSize=DesignConfig.PDF_BODY_SIZE,
                    leading=DesignConfig.PDF_BODY_SIZE * 1.2,
                    textColor=colors.black,
                )
            )

        story = [Paragraph(title, styles["CustomTitle"]), Spacer(1, 24)]
        for slide in [s.strip() for s in content.split("\n\n") if s.strip()]:
            story.extend([Paragraph(slide, styles["CustomBody"]), Spacer(1, 12)])

        doc = SimpleDocTemplate("tutorial.pdf", pagesize=letter)
        doc.build(story)

        url = cloudinary.uploader.upload("tutorial.pdf", resource_type="raw", folder="tutorials")["secure_url"]

        return {"url": url, "type": "pdf"}
    finally:
        os.chdir("/content") if os.getcwd().startswith("/content") else None
        shutil.rmtree(temp_dir, ignore_errors=True)


# ==========================
# ✅ Endpoints
# ==========================
@app.post("/generate")
async def generate(req: TutorialRequest):
    try:
        if req.output_format == "video":
            return JSONResponse(content=generate_video_content(req.title, req.content))
        else:
            return JSONResponse(content=generate_pdf_content(req.title, req.content))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "running"}


# ==========================
# ✅ Main Entry Point
# ==========================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
