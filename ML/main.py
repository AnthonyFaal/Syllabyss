import os
import textwrap
import tempfile
import shutil
from datetime import datetime
from typing import Literal
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image, ImageDraw
from gtts import gTTS
from moviepy.editor import ImageClip, concatenate_videoclips, AudioFileClip
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib import colors
from fastapi.logger import logger
import traceback
import re
import uvicorn

# ✅ Import from config.py
from config import DesignConfig, cloudinary

# ==== ✅ FastAPI App ====
app = FastAPI(title="Tutorial Generator API", description="Creates video or PDF from tutorial content")

# ==== ✅ Pydantic Schema ====
class TutorialRequest(BaseModel):
    title: str
    content: str
    output_format: Literal["video", "pdf"]

# ==== ✅ Slide Generator ====
def generate_slide(args):
    i, slide_text, title_text, is_title_slide = args
    colors_cfg = DesignConfig.COLOR_SCHEMES[DesignConfig.CURRENT_SCHEME]
    img = Image.new('RGB', (1920, 1080), color=colors_cfg["background"])
    draw = ImageDraw.Draw(img)

    if is_title_slide:
        title_bbox = draw.textbbox((0, 0), title_text, font=DesignConfig.TITLE_FONT)
        title_width = title_bbox[2] - title_bbox[0]
        draw.text(((1920 - title_width) // 2, 300), title_text, fill=colors_cfg["primary"], font=DesignConfig.TITLE_FONT)

        date_text = "Created on " + datetime.now().strftime("%B %d, %Y")
        date_bbox = draw.textbbox((0, 0), date_text, font=DesignConfig.SUBTITLE_FONT)
        date_width = date_bbox[2] - date_bbox[0]
        draw.text(((1920 - date_width) // 2, 420), date_text,
                  fill=colors_cfg["secondary"], font=DesignConfig.SUBTITLE_FONT)

        line_length = max(title_width, date_width) + 100
        draw.line([((1920 - line_length) // 2, 500), ((1920 + line_length) // 2, 500)],
                 fill=colors_cfg["accent"], width=4)
    else:
        draw.text((1800, 100), f"{i}", fill=colors_cfg["secondary"], font=DesignConfig.SUBTITLE_FONT)
        title_bbox = draw.textbbox((0, 0), title_text, font=DesignConfig.SUBTITLE_FONT)
        title_width = title_bbox[2] - title_bbox[0]
        draw.text(((1920 - title_width) // 2, 100), title_text, fill=colors_cfg["primary"], font=DesignConfig.SUBTITLE_FONT)

        y_offset = 200
        for line in textwrap.wrap(slide_text, width=50):
            line_bbox = draw.textbbox((0, 0), line, font=DesignConfig.BODY_FONT)
            line_width = line_bbox[2] - line_bbox[0]
            line_height = line_bbox[3] - line_bbox[1]
            draw.text(((1920 - line_width) // 2, y_offset), line, fill=colors_cfg["secondary"], font=DesignConfig.BODY_FONT)
            y_offset += line_height + 20
    return img


# ==== ✅ Video Generator ====
def generate_video_content(title: str, content: str):
    temp_dir = tempfile.mkdtemp()
    try:
        slides = [slide.strip() for slide in content.split('\n\n') if slide.strip()]
        slide_files = []
        text_lengths = []
        texts = []

        title_slide = generate_slide((0, "", title, True))
        title_slide_path = os.path.join(temp_dir, "slide_0.png")
        title_slide.save(title_slide_path)
        slide_files.append(title_slide_path)
        texts.append(title)
        text_lengths.append(len(title))

        for i, slide in enumerate(slides):
            slide_img = generate_slide((i + 1, slide, title, False))
            path = os.path.join(temp_dir, f"slide_{i + 1}.png")
            slide_img.save(path)
            slide_files.append(path)
            texts.append(slide)
            text_lengths.append(len(slide))

        tts = gTTS(text=f"{title}. {' '.join(slides)}", lang='en', tld='co.uk')
        audio_path = os.path.join(temp_dir, "voiceover.mp3")
        tts.save(audio_path)
        audio_clip = AudioFileClip(audio_path)

        total_audio_duration = audio_clip.duration
        total_char_count = sum(text_lengths)
        durations = [(count / total_char_count) * total_audio_duration for count in text_lengths]

        video_clips = [ImageClip(path).set_duration(duration) for path, duration in zip(slide_files, durations)]
        final_video = concatenate_videoclips(video_clips).set_audio(audio_clip)

        output_video_path = os.path.join(temp_dir, "tutorial.mp4")
        final_video.write_videofile(output_video_path, fps=24, threads=4, preset='ultrafast')

        url = cloudinary.uploader.upload(output_video_path, resource_type="video", folder="tutorials")["secure_url"]
        return {"url": url, "type": "video"}
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


# ==== ✅ Markdown to ReportLab ====
def markdown_to_reportlab(text: str) -> str:
    if text.startswith("### "):
        return f"<para alignment='left'><b>{text[4:].strip()}</b></para>"
    elif text.startswith("## "):
        return f"<para alignment='left'><b>{text[3:].strip()}</b></para>"
    elif text.startswith("# "):
        return f"<para alignment='center'><b>{text[2:].strip()}</b></para>"

    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)', r'<i>\1</i>', text)
    text = re.sub(r'__(.+?)__', r'<u>\1</u>', text)
    return text


# ==== ✅ PDF Generator ====
def generate_pdf_content(title: str, content: str):
    with tempfile.TemporaryDirectory() as temp_dir:
        pdf_path = os.path.join(temp_dir, "tutorial.pdf")
        styles = getSampleStyleSheet()

        styles.add(ParagraphStyle(name="CustomTitle", alignment=TA_CENTER,
                                  fontName=DesignConfig.PDF_TITLE_FONT,
                                  fontSize=DesignConfig.PDF_TITLE_SIZE,
                                  textColor=colors.blue, spaceAfter=20))

        styles.add(ParagraphStyle(name="CustomHeading", alignment=TA_LEFT,
                                  fontName=DesignConfig.PDF_BODY_FONT,
                                  fontSize=DesignConfig.PDF_BODY_SIZE + 2,
                                  textColor=colors.darkblue,
                                  spaceAfter=10, leading=DesignConfig.PDF_BODY_SIZE * 1.3))

        styles.add(ParagraphStyle(name="CustomBody", alignment=TA_JUSTIFY,
                                  fontName=DesignConfig.PDF_BODY_FONT,
                                  fontSize=DesignConfig.PDF_BODY_SIZE,
                                  leading=DesignConfig.PDF_BODY_SIZE * 1.5,
                                  textColor=colors.black, spaceAfter=8))

        story = [Paragraph(title.strip(), styles["CustomTitle"]), Spacer(1, 12)]
        lines = content.strip().splitlines()
        buffer = []
        in_list = False
        list_items = []

        def flush_paragraph():
            nonlocal buffer
            if buffer:
                paragraph_text = markdown_to_reportlab(" ".join(buffer).strip())
                story.append(Paragraph(paragraph_text, styles["CustomBody"]))
                story.append(Spacer(1, 6))
                buffer.clear()

        for line in lines:
            line = line.strip()
            if not line:
                flush_paragraph()
                continue
            if line.startswith("#"):
                flush_paragraph()
                heading_text = markdown_to_reportlab(line)
                story.append(Paragraph(heading_text, styles["CustomHeading"]))
                continue
            elif line.startswith("- ") or (line[:2].isdigit() and line[2:4] == ". "):
                flush_paragraph()
                if not in_list:
                    in_list = True
                    list_items = []
                item_text = line[2:].strip() if line.startswith("- ") else line[4:].strip()
                item_text = markdown_to_reportlab(item_text)
                list_items.append(ListItem(Paragraph(item_text, styles["CustomBody"])))
            else:
                if in_list:
                    story.append(ListFlowable(list_items, bulletType='bullet'))
                    story.append(Spacer(1, 6))
                    in_list = False
                    list_items = []
                buffer.append(line)

        flush_paragraph()
        if in_list:
            story.append(ListFlowable(list_items, bulletType='bullet'))
            story.append(Spacer(1, 6))

        doc = SimpleDocTemplate(pdf_path, pagesize=letter)
        doc.build(story)

        url = cloudinary.uploader.upload(pdf_path, resource_type="raw",
                                         folder="tutorials", type="upload",
                                         public_id="tutorial_public_v1",
                                         overwrite=True)["secure_url"]
        return {"url": url, "type": "pdf"}


# ==== ✅ POST Endpoint ====
@app.post("/generate")
async def generate(req: TutorialRequest):
    try:
        if req.output_format == "video":
            return JSONResponse(content=generate_video_content(req.title, req.content))
        else:
            return JSONResponse(content=generate_pdf_content(req.title, req.content))
    except Exception as e:
        logger.error(f"{str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "running"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
