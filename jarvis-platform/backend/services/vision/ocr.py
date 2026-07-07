"""OCR pipeline using pytesseract with multiple fallback strategies."""

import logging
from typing import Optional

from PIL import Image

from services.vision.screenshot import decode_image, preprocess_for_ocr

logger = logging.getLogger(__name__)


async def extract_text(
    image_data: str,
    language: str = "eng+chi_sim",
) -> dict:
    """Extract text from image using OCR.

    Args:
        image_data: Base64 encoded image
        language: Tesseract language codes

    Returns:
        dict with 'text', 'blocks', 'confidence'
    """
    image = decode_image(image_data)
    processed = preprocess_for_ocr(image)

    # Try pytesseract first
    result = await _pytesseract_ocr(processed, language)
    if result:
        return result

    # Fallback: try easyocr
    result = await _easyocr_fallback(image, language)
    if result:
        return result

    return {
        "text": "",
        "blocks": [],
        "confidence": 0.0,
        "error": "No OCR engine available",
    }


async def _pytesseract_ocr(image: Image.Image, language: str) -> Optional[dict]:
    """OCR using pytesseract."""
    try:
        import pytesseract

        # Get detailed data
        data = pytesseract.image_to_data(
            image,
            lang=language,
            output_type=pytesseract.Output.DICT,
        )

        # Extract text blocks
        blocks = []
        current_block = None

        for i in range(len(data["text"])):
            text = data["text"][i].strip()
            if not text:
                continue

            block_num = data["block_num"][i]
            conf = int(data["conf"][i]) / 100.0 if data["conf"][i] != "-1" else 0.0

            if current_block and current_block["block_num"] != block_num:
                blocks.append(current_block)
                current_block = None

            if current_block is None:
                current_block = {
                    "block_num": block_num,
                    "text": text,
                    "confidence": conf,
                    "bbox": {
                        "x": data["left"][i],
                        "y": data["top"][i],
                        "w": data["width"][i],
                        "h": data["height"][i],
                    },
                }
            else:
                current_block["text"] += " " + text
                current_block["confidence"] = max(current_block["confidence"], conf)

        if current_block:
            blocks.append(current_block)

        full_text = pytesseract.image_to_string(image, lang=language).strip()
        avg_conf = sum(b["confidence"] for b in blocks) / len(blocks) if blocks else 0.0

        return {
            "text": full_text,
            "blocks": blocks[:20],  # Limit blocks
            "confidence": round(avg_conf, 3),
            "engine": "pytesseract",
        }

    except ImportError:
        logger.debug("pytesseract not installed")
        return None
    except Exception as e:
        logger.warning(f"pytesseract OCR failed: {e}")
        return None


async def _easyocr_fallback(image: Image.Image, language: str) -> Optional[dict]:
    """Fallback OCR using easyocr."""
    try:
        import easyocr
        import numpy as np

        # Map language codes
        lang_list = []
        if "chi" in language:
            lang_list.append("ch_sim")
        if "eng" in language:
            lang_list.append("en")
        if not lang_list:
            lang_list = ["en"]

        reader = easyocr.Reader(lang_list, gpu=False)
        img_array = np.array(image)
        results = reader.readtext(img_array)

        blocks = []
        for i, (bbox, text, conf) in enumerate(results):
            blocks.append({
                "block_num": i + 1,
                "text": text,
                "confidence": round(conf, 3),
                "bbox": {
                    "x": int(bbox[0][0]),
                    "y": int(bbox[0][1]),
                    "w": int(bbox[2][0] - bbox[0][0]),
                    "h": int(bbox[2][1] - bbox[0][1]),
                },
            })

        full_text = " ".join(b["text"] for b in blocks)
        avg_conf = sum(b["confidence"] for b in blocks) / len(blocks) if blocks else 0.0

        return {
            "text": full_text,
            "blocks": blocks,
            "confidence": round(avg_conf, 3),
            "engine": "easyocr",
        }

    except ImportError:
        logger.debug("easyocr not installed")
        return None
    except Exception as e:
        logger.warning(f"easyocr failed: {e}")
        return None
