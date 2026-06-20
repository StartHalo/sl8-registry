#!/usr/bin/env bash
# Ensure Pillow (PIL) is importable. sl8-video ships python3 + pip + build tooling but does not
# pre-pin Pillow, so install it on first use. Idempotent; safe to call before every stamp/pair run.
set -e
if python3 -c "import PIL" 2>/dev/null; then
  echo "pillow: present ($(python3 -c 'import PIL; print(PIL.__version__)'))"
  exit 0
fi
echo "pillow: installing (sl8-video has build tools, PEP-668 image -> --break-system-packages)..."
pip3 install --break-system-packages --quiet pillow >/dev/null 2>&1 \
  || pip3 install --quiet pillow >/dev/null 2>&1 \
  || { echo "pillow: install FAILED — fall back to ImageMagick 'convert' for stamping" >&2; exit 4; }
python3 -c "import PIL; print('pillow:', PIL.__version__)"
