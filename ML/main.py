import os
import re
import time
import logging
import traceback
import tempfile
import textwrap
from datetime import datetime
from typing import Literal, Optional, List, Dict, Any, Tuple

# FastAPI
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator

import uvicorn

# Media & drawing
from PIL import Image, ImageDraw, ImageFont
from moviepy.editor import ImageClip, concatenate_videoclips, AudioFileClip

# PDF
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Preformatted, Flowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib import colors

# Cloudinary
import cloudinary
import cloudinary.uploader

# Numerics / audio
import numpy as np
import torch

# -------------------------- Basic Logging --------------------------
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("bark_tutorial_gen")
logger.setLevel(logging.getLevelName(os.getenv("LOG_LEVEL", "INFO")))

# ---- Headless / audio suppression (no local sound card needed) ----
os.environ.setdefault("XDG_RUNTIME_DIR", "/tmp")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
os.environ.setdefault("PYTHONWARNINGS", "ignore")

# ---- Bark torch.load patch ----
torch.serialization.add_safe_globals([np.core.multiarray.scalar])
from torch.serialization import load as _true_torch_load  # type: ignore

def _torch_load_patch(*args, **kwargs):
    kwargs.setdefault("weights_only", False)
    return _true_torch_load(*args, **kwargs)

torch.load = _torch_load_patch  # type: ignore

# ---- Bark imports & preload (after torch patches) ----
from bark import SAMPLE_RATE, generate_audio, preload_models

# ======================================================================
#                           VOICE MAP
# ======================================================================
VOICE_MAP = {
    "Aaron": "v2/en_speaker_3",  # Calm Measured
    "Ava": "v2/en_speaker_6",    # Professional Balanced
    "Liam": "v2/en_speaker_0",   # Warm Expressive
    "Noah": "v2/en_speaker_1"    # Energetic Engaging
}

def resolve_voice_id(user_voice: str) -> str:
    return VOICE_MAP.get(user_voice, user_voice or "")

def friendly_name_from_id(voice_id: str) -> str:
    for name, vid in VOICE_MAP.items():
        if vid == voice_id:
            return name
    return voice_id or "Unknown"

# ======================================================================
#                     CONFIGURATION (secrets & defaults)
# ======================================================================
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")


CONTENT_CONFIG = {
    "slide": {
        "min_duration": 2.5,   # seconds
        "max_duration": 16.0
    },
    "pdf": {
        "max_paragraphs": 64,
        "max_words_per_para": 300
    }
}

# ======================================================================
#                                FONTS
# ======================================================================

def _first_existing_path(paths: List[str]) -> Optional[str]:
    for p in paths:
        if os.path.exists(p):
            return p
    return None


def _load_ttf(size: int, bold: bool=False) -> ImageFont.FreeTypeFont:
    candidates = (
        [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "DejaVuSans-Bold.ttf",
            "arialbd.ttf",
        ]
        if bold
        else [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "DejaVuSans.ttf",
            "arial.ttf",
        ]
    )
    path = _first_existing_path(candidates)
    if path:
        try:
            return ImageFont.truetype(path, size=size)
        except Exception:
            pass
    return ImageFont.load_default()


class FontManager:
    @staticmethod
    def get_image_fonts() -> Dict[str, ImageFont.FreeTypeFont]:
        return {
            "title": _load_ttf(72, bold=True),
            "subtitle": _load_ttf(48, bold=True),
            "body": _load_ttf(40, bold=False),
            "caption": _load_ttf(36, bold=False),
            "mono": _load_ttf(36, bold=False),
        }

    @staticmethod
    def get_pdf_fonts() -> Dict[str, str]:
        return {
            "title": "Helvetica-Bold",
            "subtitle": "Helvetica-Bold",
            "body": "Helvetica",
            "mono": "Courier",
        }

# ======================================================================
#                               DESIGN
# ======================================================================
class DesignConfig:
    COLOR_SCHEMES = {
        "default": {
            "background": (25, 32, 45),
            "primary": (0, 150, 255),
            "secondary": (240, 240, 240),
            "accent": (255, 200, 0),
            "text_highlight": (100, 200, 255),
            "caption_bg": (0, 0, 0, 160),  # RGBA
            "code_bg": (30, 30, 30),
            "code_text": (220, 255, 220),
            "quote_bg": (40, 40, 60),
        }
    }

    @staticmethod
    def get_scheme() -> Dict[str, Tuple[int, int, int]]:
        return DesignConfig.COLOR_SCHEMES["default"]

    @staticmethod
    def get_fonts() -> Dict[str, ImageFont.FreeTypeFont]:
        return FontManager.get_image_fonts()

# ======================================================================
#                           HELPERS
# ======================================================================

def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, width_px: int) -> List[str]:
    words = text.split()
    lines: List[str] = []
    line = ""
    for w in words:
        test = (line + " " + w).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] <= width_px:
            line = test
        else:
            if line:
                lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines

# ======================================================================
#                           CONTENT PREP
# ======================================================================

SUPPORTED_BLOCK_TYPES = {"text", "code", "diagram", "quote", "image", "list"}


def prepare_blocks(structured_content: Optional[List[Dict[str, Any]]],
                   output_format: str,
                   legacy_content: Optional[str] = None) -> List[Dict[str, Any]]:
    blocks: List[Dict[str, Any]] = []

    if structured_content:
        for block in structured_content:
            btype = (block.get("type") or "text").lower()
            if btype not in SUPPORTED_BLOCK_TYPES:
                btype = "text"
            content = str(block.get("content", "")).strip()
            narration = str(block.get("narration", content)).strip()
            header = str(block.get("header") or "").strip() or btype.title()
            image_url = block.get("url") if btype == "image" else None
            if not content and not image_url:
                continue
            blocks.append({
                "type": btype,
                "content": content,
                "narration": narration,
                "header": header,
                "url": image_url
            })
    else:
        # Legacy fallback
        if not legacy_content:
            return []
        paragraphs = [p.strip() for p in re.split(r"\n\n+", legacy_content) if p.strip()]
        for para in paragraphs:
            blocks.append({"type": "text", "content": para, "narration": para, "header": "Overview"})

    return blocks



# ======================================================================
#                        SLIDE RENDERERS (PIL)
# ======================================================================

def draw_title_slide(title: str, friendly_name: str) -> Image.Image:
    colors_cfg = DesignConfig.get_scheme()
    fonts = DesignConfig.get_fonts()
    img = Image.new("RGB", (1920, 1080), color=colors_cfg["background"])
    draw = ImageDraw.Draw(img)

    title_bbox = draw.textbbox((0, 0), title, font=fonts["title"])
    title_w = title_bbox[2] - title_bbox[0]
    draw.text(((1920 - title_w)//2, 320), title, fill=colors_cfg["primary"], font=fonts["title"])

    voice_text = f"Voice: {friendly_name}"
    vbox = draw.textbbox((0, 0), voice_text, font=fonts["subtitle"])
    draw.text(((1920 - (vbox[2]-vbox[0]))//2, 460), voice_text, fill=colors_cfg["accent"], font=fonts["subtitle"])
    return img


def add_caption(image: Image.Image, narration: str) -> Image.Image:
    colors_cfg = DesignConfig.get_scheme()
    fonts = DesignConfig.get_fonts()

    img = image.convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0,0,0,0))
    draw = ImageDraw.Draw(overlay)

    lines = textwrap.wrap(narration or "", width=85) or [""]

    # Compute caption block size
    line_heights = []
    max_w = 0
    for line in lines:
        bbox = draw.textbbox((0,0), line, font=fonts["caption"])
        w = bbox[2] - bbox[0]; h = bbox[3] - bbox[1]
        line_heights.append(h)
        max_w = max(max_w, w)

    padding_x, padding_y = 40, 28
    block_w = min(1720, max_w + 2*padding_x)
    block_h = sum(line_heights) + (len(lines)-1)*16 + 2*padding_y

    x0 = (img.width - block_w)//2
    y0 = img.height - block_h - 60
    x1 = x0 + block_w
    y1 = y0 + block_h

    try:
        draw.rounded_rectangle([x0, y0, x1, y1], radius=24, fill=colors_cfg["caption_bg"])
    except Exception:
        draw.rectangle([x0, y0, x1, y1], fill=colors_cfg["caption_bg"])

    y_text = y0 + padding_y
    for line in lines:
        bbox = draw.textbbox((0,0), line, font=fonts["caption"])
        w = bbox[2] - bbox[0]
        x_text = x0 + (block_w - w)//2
        for dx, dy in [(1,1),(-1,1),(1,-1),(-1,-1)]:
            draw.text((x_text+dx, y_text+dy), line, font=fonts["caption"], fill=(0,0,0,255))
        draw.text((x_text, y_text), line, font=fonts["caption"], fill=(255,255,255,255))
        y_text += (bbox[3] - bbox[1]) + 16

    composed = Image.alpha_composite(img, overlay).convert("RGB")
    return composed


def render_text_block(draw: ImageDraw.ImageDraw, content: str, fonts, colors_cfg):
    draw.text((100, 120), "Key Points:", fill=colors_cfg["primary"], font=fonts["subtitle"])
    y = 200
    for line in textwrap.wrap(content, width=40):
        # subtle shadow
        for dx, dy in [(1,1),(-1,1),(1,-1),(-1,-1)]:
            draw.text((100+dx, y+dy), line, font=fonts["body"], fill=(0,0,0))
        draw.text((100, y), line, font=fonts["body"], fill=colors_cfg["secondary"])
        y += 60


def render_code_block(draw: ImageDraw.ImageDraw, content: str, fonts, colors_cfg):
    x0, y0, x1, y1 = 80, 160, 1840, 940
    draw.rectangle([x0, y0, x1, y1], fill=colors_cfg["code_bg"], outline=(200,200,200))
    y = y0 + 30
    line_height = 46
    margin = 24
    for raw_line in content.split("\n"):
        line = raw_line.replace("\t", "    ")
        # no real syntax highlight to avoid dependencies; bright code text
        draw.text((x0 + margin, y), line, font=fonts["mono"], fill=colors_cfg["code_text"])
        y += line_height
        if y > y1 - 40:
            break


def render_list_block(draw: ImageDraw.ImageDraw, content: str, fonts, colors_cfg):
    draw.text((100, 120), "List:", fill=colors_cfg["primary"], font=fonts["subtitle"])
    y = 200
    for item in re.split(r"\n+", content.strip()):
        if not item:
            continue
        bullet = "• "
        draw.text((100, y), bullet + item, font=fonts["body"], fill=colors_cfg["secondary"])
        y += 56


def render_quote_block(draw: ImageDraw.ImageDraw, content: str, fonts, colors_cfg):
    x0, y0, x1, y1 = 120, 220, 1800, 860
    draw.rectangle([x0, y0, x1, y1], fill=colors_cfg["quote_bg"]) 
    quote = f"“{content}”"
    wrapped = textwrap.wrap(quote, width=50)
    y = y0 + 60
    for line in wrapped:
        draw.text((x0 + 40, y), line, font=fonts["body"], fill=colors_cfg["secondary"])
        y += 60


def render_diagram_block(draw: ImageDraw.ImageDraw, content: str, fonts, colors_cfg):
    """Very simple flow: parse "A -> B -> C" into boxes and arrows."""
    nodes = [s.strip() for s in re.split(r"->|→", content) if s.strip()]
    if not nodes:
        render_text_block(draw, content, fonts, colors_cfg)
        return
    n = len(nodes)
    total_w = 1400
    box_w, box_h = 260, 120
    gap = (total_w - n*box_w) // max(n-1, 1) if n > 1 else 0
    start_x = (1920 - total_w)//2
    y = 420
    # draw nodes and arrows
    for i, label in enumerate(nodes):
        x = start_x + i * (box_w + gap)
        draw.rounded_rectangle([x, y, x+box_w, y+box_h], radius=18, outline=colors_cfg["accent"], width=4)
        txt = label[:32]
        tw, th = draw.textbbox((0,0), txt, font=fonts["body"])[2:]
        draw.text((x + (box_w-tw)//2, y + (box_h-th)//2), txt, font=fonts["body"], fill=colors_cfg["secondary"])
        if i < n-1:
            ax0, ay0 = x+box_w+6, y+box_h//2
            ax1 = x+box_w+gap-6
            draw.line([ax0, ay0, ax1, ay0], fill=colors_cfg["secondary"], width=4)
            # arrow head
            draw.polygon([(ax1, ay0), (ax1-14, ay0-8), (ax1-14, ay0+8)], fill=colors_cfg["secondary"])


def render_image_block(draw: ImageDraw.ImageDraw, content_url: str, fonts, colors_cfg, base_img: Image.Image):
    try:
        # Best effort: load from local path if provided; remote fetch intentionally avoided (offline environments)
        if content_url and os.path.exists(content_url):
            img = Image.open(content_url).convert("RGB").resize((1280, 720))
            base_img.paste(img, (320, 180))
            draw.rectangle([320, 180, 1600, 900], outline=colors_cfg["accent"], width=4)
        else:
            draw.text((100, 120), "[Image unavailable in offline mode]", fill=colors_cfg["primary"], font=fonts["subtitle"])
            draw.text((100, 200), content_url or "", fill=colors_cfg["secondary"], font=fonts["body"])
    except Exception:
        draw.text((100, 120), "[Failed to render image]", fill=colors_cfg["primary"], font=fonts["subtitle"])


def generate_slide_from_block(i: int, block: Dict[str, Any], title: str, friendly_name: str) -> Image.Image:
    colors_cfg = DesignConfig.get_scheme()
    fonts = DesignConfig.get_fonts()
    img = Image.new("RGB", (1920, 1080), color=colors_cfg["background"])
    draw = ImageDraw.Draw(img)

    if i == 0:  # Title slide
        return draw_title_slide(title, friendly_name)

    btype = block.get("type", "text")
    content = block.get("content", "")
    header = block.get("header") or btype.title()  # use header field

    # Header placement and design
    header_bbox = draw.textbbox((0,0), header, font=fonts["subtitle"])
    header_w, header_h = header_bbox[2]-header_bbox[0], header_bbox[3]-header_bbox[1]
    draw.text(((1920-header_w)//2, 60), header, fill=colors_cfg["primary"], font=fonts["subtitle"])

    # Slightly lower starting y for content to respect header
    content_y_start = 150

    if btype == "text":
        render_text_block(draw, content, fonts, colors_cfg)
    elif btype == "code":
        render_code_block(draw, content, fonts, colors_cfg)
    elif btype == "diagram":
        render_diagram_block(draw, content, fonts, colors_cfg)
    elif btype == "quote":
        render_quote_block(draw, content, fonts, colors_cfg)
    elif btype == "image":
        render_image_block(draw, block.get("url"), fonts, colors_cfg, img)
    elif btype == "list":
        render_list_block(draw, content, fonts, colors_cfg)
    else:
        render_text_block(draw, content, fonts, colors_cfg)

    return img
 

# ======================================================================
#                           VOICE GENERATION
# ======================================================================

def generate_voiceover(text: str, bark_voice_id: str) -> str:
    logger.info(f"Generating voiceover for {len(text or '')} chars...")
    try:
        audio_array = generate_audio(text or "", history_prompt=bark_voice_id)
        if hasattr(audio_array, "detach"):
            audio_array = audio_array.detach().cpu().numpy()
        audio_array = np.asarray(audio_array, dtype=np.float32)

        max_amp = float(np.max(np.abs(audio_array))) if audio_array.size else 0.0
        if max_amp == 0.0:
            audio_array = np.zeros(1, dtype=np.int16)
        else:
            audio_array = np.int16((audio_array / max_amp) * 32767)

        from scipy.io.wavfile import write as write_wav
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            write_wav(f.name, SAMPLE_RATE, audio_array)
            return f.name
    except Exception as e:
        logger.error("Bark voice generation failed: %s\n%s", str(e), traceback.format_exc())
        raise RuntimeError("Voice generation failed") from e

# ======================================================================
#                              VIDEO GEN
# ======================================================================

def generate_video_from_blocks(title: str, blocks: List[Dict[str, Any]], bark_voice_id: str, friendly_name: str) -> Dict[str, Any]:
    start_time = time.time()
    temp_dir = tempfile.mkdtemp()
    try:
        clips: List[ImageClip] = []

        # Title slide (no narration or short narration = title)
        title_img = draw_title_slide(title, friendly_name)
        title_path = os.path.join(temp_dir, "slide_0.png")
        title_img.save(title_path)
        title_clip = ImageClip(title_path).set_duration(3.0)
        clips.append(title_clip)

        for i, block in enumerate(blocks, start=1):
            slide_img = generate_slide_from_block(i, block, title, friendly_name)
            # burn captions (narration) into slide image
            slide_img_with_caption = add_caption(slide_img, block.get("narration", ""))
            slide_path = os.path.join(temp_dir, f"slide_{i}.png")
            slide_img_with_caption.save(slide_path)

            # audio for this block
            narration = block.get("narration", "")
            audio_path = generate_voiceover(narration, bark_voice_id) if narration else None
            audio_clip = AudioFileClip(audio_path) if audio_path else None

            # duration ties to audio (bounded)
            base_duration = audio_clip.duration if audio_clip else 3.0
            duration = max(CONTENT_CONFIG["slide"]["min_duration"], min(CONTENT_CONFIG["slide"]["max_duration"], base_duration))

            clip = ImageClip(slide_path).set_duration(duration)
            if audio_clip:
                clip = clip.set_audio(audio_clip)
            clips.append(clip)

        final_video = concatenate_videoclips(clips, method="compose")
        output_path = os.path.join(temp_dir, "tutorial.mp4")
        final_video.write_videofile(
            output_path,
            fps=15,
            threads=2,
            preset="superfast",
            audio_codec="aac",
            codec="libx264",
            temp_audiofile=os.path.join(temp_dir, "temp-audio.m4a"),
            remove_temp=True,
            verbose=False,
            logger=None,
        )

        # Upload to Cloudinary if configured
        if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
            try:
                result = cloudinary.uploader.upload(
                    output_path,
                    resource_type="video",
                    folder="tutorials",
                    timeout=180,
                    chunk_size=5 * 1024 * 1024,
                    public_id=f"tutorial_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                )
                logger.info("Video generation took %.2f seconds", time.time() - start_time)
                return {"url": result["secure_url"], "type": "video"}
            except Exception as e:
                logger.error("Cloudinary upload failed: %s\n%s", str(e), traceback.format_exc())
                return {"path": output_path, "type": "video", "note": "Cloudinary upload failed"}
        else:
            return {"path": output_path, "type": "video"}
    finally:
        # Intentionally keep temp dir while path is referenced
        pass

# ======================================================================
#                                PDF GEN
# ======================================================================

class DiagramFlowable(Flowable):
    def __init__(self, text: str, max_width=500, max_height=200):
        super().__init__()
        self.text = text
        self.max_width = max_width
        self.max_height = max_height
        self.width = max_width
        self.height = max_height

    def draw(self):
        c = self.canv
        nodes = [s.strip() for s in re.split(r"->|→", self.text) if s.strip()] or [self.text]
        n = len(nodes)
        gap = 20
        box_w = min(100, (self.max_width - gap*(n-1))/max(n,1))
        box_h = min(40, self.max_height*0.6)
        total_w = n*box_w + (n-1)*gap
        start_x = (self.max_width - total_w)/2
        y = self.max_height/2 - box_h/2

        for i, label in enumerate(nodes):
            x = start_x + i*(box_w + gap)
            c.setStrokeColor(colors.darkblue)
            c.setFillColor(colors.lightblue)
            c.roundRect(x, y, box_w, box_h, 6, stroke=1, fill=1)
            c.setFillColor(colors.black)
            c.setFont("Helvetica", 8)
            c.drawCentredString(x + box_w/2, y + box_h/2 - 4, label[:16])
            if i < n-1:
                ax0 = x + box_w
                ax1 = x + box_w + gap
                ay = y + box_h/2
                c.setStrokeColor(colors.black)
                c.line(ax0, ay, ax1, ay)
                c.line(ax1-4, ay-3, ax1, ay)
                c.line(ax1-4, ay+3, ax1, ay)


def generate_pdf_from_blocks(title: str, blocks: List[Dict[str, Any]], bark_voice_id: str, friendly_name: Optional[str] = None):
    with tempfile.TemporaryDirectory() as temp_dir:
        pdf_path = os.path.join(temp_dir, "tutorial.pdf")
        styles = getSampleStyleSheet()
        pdf_fonts = FontManager.get_pdf_fonts()

        styles.add(ParagraphStyle(
            name="PdfTitle", alignment=TA_CENTER, fontName=pdf_fonts["title"], fontSize=20,
            textColor=colors.HexColor("#0066CC"), spaceAfter=20, leading=24,
        ))
        styles.add(ParagraphStyle(
            name="PdfHeading", alignment=TA_LEFT, fontName=pdf_fonts["subtitle"], fontSize=14,
            textColor=colors.HexColor("#003366"), spaceAfter=12, leading=16,
        ))
        styles.add(ParagraphStyle(
            name="PdfBody", alignment=TA_JUSTIFY, fontName=pdf_fonts["body"], fontSize=11,
            leading=14, textColor=colors.black, spaceAfter=8,
        ))
        styles.add(ParagraphStyle(
            name="PdfCode", alignment=TA_LEFT, fontName=pdf_fonts["mono"], fontSize=9,
            leading=12, textColor=colors.HexColor("#00AA55"), backColor=colors.HexColor("#111111"),
        ))

        story: List[Any] = []
        story.append(Paragraph(title, styles["PdfTitle"]))
        story.append(Spacer(1, 16))

        for block in blocks:
            btype = block.get("type", "text")
            content = block.get("content", "")
            header = block.get("header") or btype.title()
            if btype == "code":
                story.append(Paragraph(header, styles["PdfHeading"]))
                story.append(Preformatted(content, styles["PdfCode"]))
                story.append(Spacer(1, 12))
            elif btype == "diagram":
                story.append(Paragraph(header, styles["PdfHeading"]))
                story.append(Spacer(1, 6))
                story.append(DiagramFlowable(content))
                story.append(Spacer(1, 12))
            elif btype == "list":
                story.append(Paragraph(header, styles["PdfHeading"]))
                for li in re.split(r"\n+", content.strip()):
                    if li:
                        story.append(Paragraph(f"• {li}", styles["PdfBody"]))
                story.append(Spacer(1, 12))
            elif btype == "quote":
                story.append(Paragraph(header, styles["PdfHeading"]))
                story.append(Paragraph(f"<i>{content}</i>", styles["PdfBody"]))
                story.append(Spacer(1, 12))
            else:
                story.append(Paragraph(header, styles["PdfHeading"]))
                story.append(Paragraph(content, styles["PdfBody"]))
                story.append(Spacer(1, 8))

        doc = SimpleDocTemplate(pdf_path, pagesize=letter)
        doc.build(story)

        # Upload PDF to Cloudinary
        if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
            try:
                result = cloudinary.uploader.upload(
                    pdf_path,
                    resource_type="raw",
                    folder="tutorials",
                    timeout=180,
                    chunk_size=5*1024*1024,
                    public_id=f"tutorial_pdf_{datetime.now().strftime('%Y%m%d%H%M%S')}"
                )
                return {"url": result["secure_url"], "type": "pdf"}
            except Exception as e:
                logger.error("Cloudinary PDF upload failed: %s\n%s", str(e), traceback.format_exc())
                return {"path": pdf_path, "type": "pdf", "note": "Cloudinary upload failed"}
        else:
            return {"path": pdf_path, "type": "pdf"}



# ======================================================================
#                           CLOUDINARY & BARK INIT
# ======================================================================
if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    cloudinary.config(cloud_name=CLOUDINARY_CLOUD_NAME, api_key=CLOUDINARY_API_KEY, api_secret=CLOUDINARY_API_SECRET)
else:
    logger.warning("Cloudinary not configured; will return local file paths.")

# Preload Bark models safely
try:
    preload_models(text_use_gpu=True, text_use_small=True, coarse_use_gpu=True, fine_use_gpu=True)
    logger.info("Bark models preloaded (GPU if available).")
except Exception as e:
    logger.warning("Bark preload on GPU failed (%s); retrying CPU...", str(e))
    try:
        preload_models(text_use_gpu=False, text_use_small=True, coarse_use_gpu=False, fine_use_gpu=False)
        logger.info("Bark models preloaded on CPU.")
    except Exception as e2:
        logger.error("Bark preload failed entirely: %s\n%s", str(e2), traceback.format_exc())

# ======================================================================
#                                 API
# ======================================================================
app = FastAPI(title="Bark Voice Tutorial Generator (Block-Synced)", description="Generates tutorials with Bark TTS and styled visuals")


# ---------------------- Models & Validation ----------------------
class StructuredBlock(BaseModel):
    type: Literal["text", "code", "diagram", "quote", "list"] = "text"
    content: Optional[str] = None
    narration: Optional[str] = None


# ---------------------- Models & Validation ----------------------
class TutorialRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    structured_content: Optional[List[StructuredBlock]] = None
    content: Optional[str] = None  # legacy text
    output_format: Literal["video", "pdf"]
    voice: Optional[str] = None  # <-- now optional

    @validator("voice", always=True)
    def check_voice_for_video(cls, v, values):
        if values.get("output_format") == "video" and not v:
            raise ValueError("Voice must be provided for video output")
        return v

    @validator("structured_content", always=True)
    def check_blocks_or_content(cls, v, values):
        if not v and not values.get("content"):
            raise ValueError("You must provide either structured_content or content")
        return v


@app.get("/system_status")
async def system_status():
    try:
        import psutil
        return {
            "cpu_usage": psutil.cpu_percent(),
            "memory": psutil.virtual_memory()._asdict(),
            "disk": psutil.disk_usage('/')._asdict()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


def json_error(status: int, e: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={
            "status": "error",
            "error_type": type(e).__name__,
            "message": str(e),
            "traceback": traceback.format_exc(),
        },
    )

# ---------------------- Global Error Handlers ----------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error("HTTPException at %s: %s", request.url.path, exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "error", "message": exc.detail, "error_type": "HTTPException"},
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(
        "\n--- UNHANDLED ERROR ---\nPath: %s\nType: %s\nMessage: %s\nTraceback:\n%s\n------------------------",
        request.url.path, type(exc).__name__, str(exc), traceback.format_exc()
    )
    return json_error(500, exc)

# ---------------------------- Endpoint ----------------------------
@app.post("/generate")
async def generate_tutorial(req: TutorialRequest, request: Request):
    try:
        expected_structure = {
            "title": "string (required)",
            "structured_content": [
                {
                    "type": "text | code | diagram | quote | list",
                    "content": "string (required for block)",
                    "narration": "string (optional)"
                }
            ],
            "content": "string (legacy fallback, optional)",
            "output_format": "video | pdf",
            "voice": "string (required)"
        }
        logger.info(f"📌 Expected structure:\n{expected_structure}")

        # log request body
        body = await request.json()
        logger.info(f"📥 Received data:\n{body}")

        # reject image type explicitly
        if req.structured_content:
            for block in req.structured_content:
                if block.type == "image":
                    raise HTTPException(
                        status_code=400,
                        detail="Image blocks are no longer supported"
                    )

        # resolve voice
        bark_voice_id = resolve_voice_id(req.voice)
        friendly_name = friendly_name_from_id(bark_voice_id)

        # normalize blocks
        blocks = prepare_blocks(
            structured_content=[b.dict() for b in req.structured_content] if req.structured_content else None,
            output_format=req.output_format,
            legacy_content=req.content,
        )
        if not blocks:
            raise HTTPException(status_code=400, detail="No content blocks to render")

        # generate
        if req.output_format == "video":
            result = generate_video_from_blocks(req.title, blocks, bark_voice_id, friendly_name)
        else:
            result = generate_pdf_from_blocks(req.title, blocks, bark_voice_id, friendly_name)

        result["voice"] = {"friendly_name": friendly_name, "bark_id": bark_voice_id}
        return JSONResponse(content=result)

    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(
            "\n--- ERROR in /generate ---\nExpected structure: %s\nReceived: %s\nPath: %s\nType: %s\nMessage: %s\nTraceback:\n%s\n--------------------",
            expected_structure, body, request.url.path, type(e).__name__, str(e), traceback.format_exc()
        )
        return json_error(500, e)

# ======================================================================
#                                SERVER
# ======================================================================
if __name__ == "__main__":
   
    print(f"🚀 Starting server on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)