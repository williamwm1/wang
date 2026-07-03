@echo off
REM VoiceForge AI - Windows double-click launcher.
REM Creates a local venv, installs dependencies once, then launches the app.
setlocal
cd /d "%~dp0..\.."

set PY=python
where %PY% >nul 2>nul
if errorlevel 1 (
  echo 找不到 Python。请先安装 Python 3.9+ 并勾选 "Add to PATH"：
  echo   https://www.python.org/downloads/
  pause
  exit /b 1
)

if not exist ".vf_venv" (
  echo 首次运行：正在创建虚拟环境并安装依赖（约 1-3 分钟）...
  %PY% -m venv .vf_venv
  call .vf_venv\Scripts\activate.bat
  python -m pip install --upgrade pip
  python -m pip install -r voiceforge\requirements.txt imageio-ffmpeg
) else (
  call .vf_venv\Scripts\activate.bat
)

echo 启动 VoiceForge AI...
python -m voiceforge.app
if errorlevel 1 pause
