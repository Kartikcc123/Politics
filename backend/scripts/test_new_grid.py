import cv2
import numpy as np
import os
import sys

# Test script to verify improved detect_card_boxes
def new_detect_card_boxes(image):
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 31, 9,
    )
    horizontal = cv2.morphologyEx(
        binary,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_RECT, (max(40, width // 20), 1)),
    )
    vertical = cv2.morphologyEx(
        binary,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(20, height // 80))),
    )
    grid = cv2.bitwise_or(horizontal, vertical)
    contours, _ = cv2.findContours(grid, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if (
            width * 0.25 <= w <= width * 0.34
            and height * 0.065 <= h <= height * 0.105
            and y > height * 0.02
        ):
            boxes.append((x, y, w, h))
    unique = []
    for box in sorted(boxes, key=lambda b: (b[1], b[0])):
        if not any(abs(box[0] - old[0]) < width * 0.10 and abs(box[1] - old[1]) < height * 0.03 for old in unique):
            unique.append(box)

    # Standard fallback parameters
    left = round(width * 0.038)
    top = round(height * 0.076)
    card_w = round(width * 0.306)
    card_h = round(height * 0.088)
    gap_x = round(width * 0.007)
    gap_y = round(height * 0.003)

    if len(unique) >= 6:
        try:
            med_w = int(np.median([b[2] for b in unique]))
            med_h = int(np.median([b[3] for b in unique]))
            if not (width * 0.25 <= med_w <= width * 0.35):
                med_w = card_w
            if not (height * 0.065 <= med_h <= height * 0.11):
                med_h = card_h

            # 1. Cluster detected boxes into rows
            sorted_by_y = sorted(unique, key=lambda b: b[1])
            row_clusters = []
            for b in sorted_by_y:
                matched_row = False
                for cl in row_clusters:
                    if abs(np.median([box[1] for box in cl]) - b[1]) < med_h * 0.4:
                        cl.append(b)
                        matched_row = True
                        break
                if not matched_row:
                    row_clusters.append([b])

            row_clusters.sort(key=lambda cl: np.median([box[1] for box in cl]))
            row_ys = [int(np.median([b[1] for b in cl])) for cl in row_clusters]

            # 2. Determine actual row pitch from consecutive row differences
            diffs = [row_ys[i+1] - row_ys[i] for i in range(len(row_ys)-1)]
            valid_diffs = [d for d in diffs if med_h * 0.85 <= d <= med_h * 1.35]
            row_pitch = int(np.median(valid_diffs)) if valid_diffs else int(round(med_h * 1.04))

            # 3. Determine Row 0 Y
            row0_y = row_ys[0]
            if row0_y >= height * 0.12:
                row0_y = row0_y - int(round((row0_y - round(height * 0.076)) / row_pitch)) * row_pitch

            # 4. Determine 3 Column X positions
            c0 = [b[0] for b in unique if b[0] < width * 0.25]
            c1 = [b[0] for b in unique if width * 0.25 <= b[0] < width * 0.58]
            c2 = [b[0] for b in unique if b[0] >= width * 0.58]
            col_x = [
                int(np.median(c0)) if c0 else round(width * 0.038),
                int(np.median(c1)) if c1 else round(width * 0.352),
                int(np.median(c2)) if c2 else round(width * 0.666)
            ]

            # 5. Assemble grid slots, validating missing slots against real content
            final_boxes = []
            for r in range(10):
                exp_y = row0_y + r * row_pitch
                if exp_y + med_h > height - round(height * 0.015):
                    continue
                for c in range(3):
                    exp_x = col_x[c]
                    match = next((b for b in unique if abs(b[0] - exp_x) < width * 0.08 and abs(b[1] - exp_y) < med_h * 0.35), None)
                    if match:
                        final_boxes.append(match)
                    else:
                        # Check if this slot contains actual card content or is blank paper
                        slot_crop = gray[exp_y:min(height, exp_y + med_h), exp_x:min(width, exp_x + med_w)]
                        if slot_crop.size > 0:
                            edges = cv2.Canny(slot_crop, 50, 150)
                            if np.count_nonzero(edges) > 2500:
                                final_boxes.append((exp_x, exp_y, med_w, med_h))

            if len(final_boxes) >= 6:
                return final_boxes
        except Exception as e:
            print(f"Error in robust grid: {e}")

    # Fallback to standard 3x10 grid
    return [
        (left + col * (card_w + gap_x), top + row * (card_h + gap_y), card_w, card_h)
        for row in range(10)
        for col in range(3)
    ]

img = cv2.imread('uploads/test_amli_p3.png')
res = new_detect_card_boxes(img)
print(f"Total detected boxes: {len(res)}")
for idx, b in enumerate(res):
    print(f"Card {idx+1:02d}: {b}")
