import os
from typing import Dict, Any

# ======================================================================
#                     CONFIGURATION (secrets & defaults)
# ======================================================================
# Removed hardcoded values - will use environment variables directly
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

CONTENT_CONFIG: Dict[str, Any] = {
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