FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    chromium \
    imagemagick \
    poppler-utils \
    python3 \
    python-is-python3 \
    python3-pip \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    wget \
  && wget -q https://github.com/tesseract-ocr/tessdata_best/raw/main/hin.traineddata -O /usr/share/tesseract-ocr/5/tessdata/hin.traineddata \
  && rm -rf /var/lib/apt/lists/*

RUN printf '#!/bin/sh\nif [ "$1" = "identify" ]; then shift; exec identify "$@"; fi\nexec convert "$@"\n' > /usr/local/bin/magick \
  && chmod +x /usr/local/bin/magick

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/python/requirements.txt ./python/requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -r python/requirements.txt

COPY backend/ .

RUN pdftoppm -v \
  && pdfimages -v \
  && tesseract --list-langs \
  && magick -version \
  && python --version \
  && python3 --version

ENV NODE_ENV=production
ENV PYTHON_PATH=python3
ENV PDFTOPPM_PATH=pdftoppm
ENV PDFINFO_PATH=pdfinfo
ENV PDFIMAGES_PATH=pdfimages
ENV TESSERACT_PATH=tesseract
ENV IMAGEMAGICK_PATH=magick
ENV CHROME_PATH=/usr/bin/chromium
ENV OCR_LANGUAGES=hin+eng
ENV OCR_DPI=180
ENV OCR_PAGE_CONCURRENCY=1
ENV OCR_CELL_CONCURRENCY=1
ENV OCR_CARD_FALLBACKS_PER_PAGE=1
ENV IMAGE_CROP_CONCURRENCY=1
ENV OMP_THREAD_LIMIT=1

CMD ["npm", "start"]
