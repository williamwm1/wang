#!/bin/bash
# VoiceForge AI — Linux launcher (venv + deps, then run the desktop app).
set -e
cd "$(dirname "$0")/../.."

PY="${PYTHON:-python3}"
command -v "$PY" >/dev/null || { echo "Install Python 3.9+ first."; exit 1; }

VENV=".vf_venv"
if [ ! -d "$VENV" ]; then
  echo "First run: creating venv and installing dependencies..."
  "$PY" -m venv "$VENV"
  "$VENV/bin/python" -m pip install --upgrade pip >/dev/null
  "$VENV/bin/python" -m pip install -r voiceforge/requirements.txt imageio-ffmpeg
fi

exec "$VENV/bin/python" -m voiceforge.app
