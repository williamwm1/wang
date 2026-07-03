#!/bin/bash
# VoiceForge AI — macOS double-click launcher.
# Right-click → Open the first time (unsigned script). Creates a local venv,
# installs dependencies once, then launches the desktop app.
set -e
cd "$(dirname "$0")/../.."          # repo root (contains the voiceforge/ package)

PY="${PYTHON:-python3}"
if ! command -v "$PY" >/dev/null 2>&1; then
  echo "找不到 python3。请先安装 Python 3.9+：https://www.python.org/downloads/"
  read -n 1 -s -r -p "按任意键退出…"; exit 1
fi

VENV=".vf_venv"
if [ ! -d "$VENV" ]; then
  echo "首次运行：正在创建虚拟环境并安装依赖（约 1–3 分钟）…"
  "$PY" -m venv "$VENV"
  "$VENV/bin/python" -m pip install --upgrade pip >/dev/null
  "$VENV/bin/python" -m pip install -r voiceforge/requirements.txt imageio-ffmpeg
fi

echo "启动 VoiceForge AI…"
exec "$VENV/bin/python" -m voiceforge.app
