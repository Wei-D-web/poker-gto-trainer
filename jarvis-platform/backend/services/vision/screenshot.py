"""Screenshot processing: decode, preprocess, analyze."""

import base64
import io
import logging
from typing import Optional, Tuple

from PIL import Image, ImageEnhance

logger = logging.getLogger(__name__)


def decode_image(image_data: str) -> Image.Image:
    """Decode base64 image to PIL Image.

    Args:
        image_data: Raw base64 or data URL (data:image/jpeg;base64,...)
    """
    # Strip data URL prefix if present
    if "," in image_data:
        image_data = image_data.split(",")[1]

    image_bytes = base64.b64decode(image_data)
    return Image.open(io.BytesIO(image_bytes))


def preprocess_for_ocr(image: Image.Image) -> Image.Image:
    """Preprocess image for better OCR results.

    - Convert to grayscale
    - Increase contrast
    - Apply sharpening
    """
    # Grayscale
    gray = image.convert("L")

    # Increase contrast
    enhancer = ImageEnhance.Contrast(gray)
    enhanced = enhancer.enhance(2.0)

    # Sharpen
    enhancer = ImageEnhance.Sharpness(enhanced)
    sharpened = enhancer.enhance(2.0)

    return sharpened


def preprocess_for_vision(image: Image.Image, max_size: int = 2048) -> Image.Image:
    """Resize image for vision API (keep aspect ratio, cap dimensions)."""
    w, h = image.size
    if w <= max_size and h <= max_size:
        return image

    ratio = min(max_size / w, max_size / h)
    new_size = (int(w * ratio), int(h * ratio))
    return image.resize(new_size, Image.Resampling.LANCZOS)


def encode_image(image: Image.Image, format: str = "JPEG", quality: int = 85) -> str:
    """Encode PIL Image to base64 string."""
    buffer = io.BytesIO()
    image.save(buffer, format=format, quality=quality)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def detect_changes(
    prev_image: Image.Image,
    curr_image: Image.Image,
    threshold: float = 0.05,
) -> Tuple[bool, float]:
    """Detect visual changes between two images.

    Args:
        prev_image: Previous screenshot
        curr_image: Current screenshot
        threshold: Change ratio threshold (0.0 - 1.0)

    Returns:
        (has_changed, change_ratio)
    """
    # Resize both to same size for comparison
    size = (320, 240)  # Small for fast comparison
    prev_small = prev_image.resize(size, Image.Resampling.LANCZOS)
    curr_small = curr_image.resize(size, Image.Resampling.LANCZOS)

    # Convert to grayscale
    prev_gray = prev_small.convert("L")
    curr_gray = curr_small.convert("L")

    # Pixel-by-pixel difference
    prev_data = list(prev_gray.getdata())
    curr_data = list(curr_gray.getdata())

    total_pixels = len(prev_data)
    changed_pixels = sum(
        1 for p, c in zip(prev_data, curr_data)
        if abs(p - c) > 25  # Significant change threshold
    )

    change_ratio = changed_pixels / total_pixels
    return change_ratio > threshold, change_ratio
