"""Run classic OpenCV detectors over the "In the room" photos and save their boxes.

The gallery's "Run vision model" overlay draws exactly what this script finds, so the
boxes on the site are real model output, not hand-drawn. Only confident detections are
kept; the thresholds below were checked by eye against each photo.

Usage: python scripts/detect-photos.py   (needs opencv-python)
"""

import json
from pathlib import Path

import cv2

ROOT = Path(__file__).resolve().parent.parent
PHOTOS = ROOT / "public" / "assets" / "room"
OUT = ROOT / "src" / "lib" / "data" / "detections.json"

PHOTO_IDS = ["lab-helping", "lab-wide", "build-with-ai-2026"]
MIN_PERSON = 1.0  # HOG + linear SVM margin (raw, not a probability)
MIN_FACE = 6.0  # Haar cascade final-stage score

hog = cv2.HOGDescriptor()
hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
faces_model = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def detect(path: Path) -> dict:
    img = cv2.imread(str(path))
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    boxes = []
    rects, weights = hog.detectMultiScale(img, winStride=(8, 8), padding=(8, 8), scale=1.05)
    for (x, y, bw, bh), score in zip(rects, weights):
        score = float(score)
        # A person box must be tall enough to be a whole figure, not a fragment of one
        if score >= MIN_PERSON and bh >= h * 0.4:
            boxes.append({"label": "person", "score": round(score, 2), "box": [int(x), int(y), int(bw), int(bh)]})

    rects, _, weights = faces_model.detectMultiScale3(gray, 1.1, 6, minSize=(24, 24), outputRejectLevels=True)
    for (x, y, bw, bh), score in zip(rects, weights):
        if float(score) >= MIN_FACE:
            boxes.append({"label": "face", "score": round(float(score), 1), "box": [int(x), int(y), int(bw), int(bh)]})

    return {"width": w, "height": h, "boxes": boxes}


def main() -> None:
    result = {pid: detect(PHOTOS / f"{pid}.webp") for pid in PHOTO_IDS}
    OUT.write_text(json.dumps(result, indent=1) + "\n", encoding="utf-8")
    for pid, r in result.items():
        counts = {}
        for b in r["boxes"]:
            counts[b["label"]] = counts.get(b["label"], 0) + 1
        print(pid, counts)


if __name__ == "__main__":
    main()
