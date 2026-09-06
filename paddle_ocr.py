import sys, json, os, traceback

# PaddleOCR 3.x local OCR runner for INTENDFLASH.
# The Node app calls this script and receives structured OCR text + boxes.

def to_plain(value):
    if value is None:
        return None
    if hasattr(value, "tolist"):
        try:
            return value.tolist()
        except Exception:
            pass
    if isinstance(value, dict):
        return {str(k): to_plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_plain(v) for v in value]
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def payload_from_result(res):
    # PaddleOCR 3.x OCRResult exposes JSON-friendly data through .json.
    try:
        value = getattr(res, "json", None)
        if value is not None:
            if callable(value):
                value = value()
            if isinstance(value, str):
                try:
                    return json.loads(value)
                except Exception:
                    pass
            if isinstance(value, dict):
                return value
    except Exception:
        pass
    if isinstance(res, dict):
        return res
    try:
        return to_plain(res)
    except Exception:
        return {}


def find_first(obj, keys):
    wanted = {k.lower() for k in keys}
    if isinstance(obj, dict):
        for k, v in obj.items():
            if str(k).lower() in wanted:
                return v
        for v in obj.values():
            found = find_first(v, keys)
            if found is not None:
                return found
    elif isinstance(obj, list):
        for v in obj:
            found = find_first(v, keys)
            if found is not None:
                return found
    return None


def extract_items(payload):
    texts = find_first(payload, ["rec_texts", "texts", "rec_text"])
    scores = find_first(payload, ["rec_scores", "scores", "rec_score"])
    boxes = find_first(payload, ["rec_boxes", "dt_polys", "boxes", "textline_boxes"])

    if isinstance(texts, str):
        texts = [texts]
    if not isinstance(texts, list):
        texts = []
    if not isinstance(scores, list):
        scores = [scores] * len(texts) if scores is not None else []
    if not isinstance(boxes, list):
        boxes = []

    items = []
    for i, text in enumerate(texts):
        text = str(text or "").strip()
        if not text:
            continue
        score = scores[i] if i < len(scores) else None
        try:
            score = float(score) if score is not None else None
        except Exception:
            score = None
        box = boxes[i] if i < len(boxes) else None
        items.append({"text": text, "score": score, "box": to_plain(box)})
    return items


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: paddle_ocr.py <json-input-path>")

    with open(sys.argv[1], "r", encoding="utf-8") as f:
        request = json.load(f)

    image_paths = request.get("images", [])
    if not image_paths:
        print(json.dumps({"ok": False, "error": "No images supplied"}))
        return

    try:
        from paddleocr import PaddleOCR
    except Exception as exc:
        print(json.dumps({
            "ok": False,
            "error": "PaddleOCR is not installed. Run START_INTENDFLASH.bat or install requirements.txt.",
            "detail": str(exc)
        }))
        return

    # PaddleOCR 3.x uses its own document/text detection and recognition pipeline.
    # Keep orientation/unwarping off here because the Node side supplies normalized pages.
    ocr = PaddleOCR(
        lang="en",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )

    all_pages = []
    combined = []

    for image_path in image_paths:
        result_items = []
        try:
            results = ocr.predict(image_path)
            for res in results:
                payload = payload_from_result(res)
                result_items.extend(extract_items(payload))
        except Exception as exc:
            all_pages.append({"image": image_path, "items": [], "error": str(exc)})
            continue

        # Sort OCR blocks top-to-bottom then left-to-right when coordinates exist.
        def sort_key(item):
            box = item.get("box")
            try:
                pts = box
                if isinstance(pts, list) and pts and isinstance(pts[0], list):
                    y = min(float(p[1]) for p in pts if len(p) >= 2)
                    x = min(float(p[0]) for p in pts if len(p) >= 2)
                    return (y, x)
                if isinstance(pts, list) and len(pts) >= 4:
                    return (float(pts[1]), float(pts[0]))
            except Exception:
                pass
            return (10**9, 10**9)

        result_items.sort(key=sort_key)
        all_pages.append({"image": image_path, "items": result_items})
        combined.append("\n".join(i["text"] for i in result_items))

    print(json.dumps({
        "ok": True,
        "text": "\n--- PAGE ---\n".join(combined),
        "pages": all_pages
    }, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc), "trace": traceback.format_exc()}))
