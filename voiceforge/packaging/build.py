"""
build.py
========
One-command builder that produces a self-contained VoiceForge desktop binary
for the OS you run it on:

    Windows -> dist/VoiceForge/VoiceForge.exe
    macOS   -> dist/VoiceForge.app
    Linux   -> dist/VoiceForge/VoiceForge

Steps:
  1. Ensure PyInstaller + imageio-ffmpeg are installed.
  2. Copy the static ffmpeg binary into voiceforge/bin/ so the app ships FFmpeg.
  3. Run PyInstaller against voiceforge/packaging/voiceforge.spec.

IMPORTANT: PyInstaller cannot cross-compile.  Run this ON the target OS —
build the .exe on Windows and the .app on macOS.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys

PKG_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # voiceforge/
REPO_DIR = os.path.dirname(PKG_DIR)
SPEC = os.path.join(PKG_DIR, "packaging", "voiceforge.spec")
BIN_DIR = os.path.join(PKG_DIR, "bin")


def _pip_install(*pkgs: str) -> None:
    subprocess.check_call([sys.executable, "-m", "pip", "install", *pkgs])


def _ensure_deps() -> None:
    try:
        import PyInstaller  # noqa: F401
    except Exception:
        print("Installing PyInstaller...")
        _pip_install("pyinstaller")
    try:
        import imageio_ffmpeg  # noqa: F401
    except Exception:
        print("Installing imageio-ffmpeg (static FFmpeg)...")
        _pip_install("imageio-ffmpeg")


def _bundle_ffmpeg() -> None:
    """Copy the static ffmpeg binary into voiceforge/bin/."""
    import imageio_ffmpeg
    src = imageio_ffmpeg.get_ffmpeg_exe()
    os.makedirs(BIN_DIR, exist_ok=True)
    ext = ".exe" if os.name == "nt" else ""
    dst = os.path.join(BIN_DIR, "ffmpeg" + ext)
    shutil.copy2(src, dst)
    if os.name != "nt":
        os.chmod(dst, 0o755)
    print(f"Bundled ffmpeg -> {dst}")


def main() -> int:
    _ensure_deps()
    _bundle_ffmpeg()
    print("Running PyInstaller...")
    rc = subprocess.call([
        sys.executable, "-m", "PyInstaller",
        "--noconfirm", "--clean",
        "--distpath", os.path.join(REPO_DIR, "dist"),
        "--workpath", os.path.join(REPO_DIR, "build"),
        SPEC,
    ], cwd=REPO_DIR)
    if rc == 0:
        dist = os.path.join(REPO_DIR, "dist")
        print("\n✔ Build complete. See:", dist)
        for name in sorted(os.listdir(dist)) if os.path.isdir(dist) else []:
            print("   -", name)
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
