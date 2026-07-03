# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for VoiceForge AI.

Build (on the *target* OS — Windows for .exe, macOS for .app):

    python voiceforge/packaging/build.py

or directly:

    pyinstaller voiceforge/packaging/voiceforge.spec

The build script first copies a static ffmpeg binary into ``voiceforge/bin/``
so the app is self-contained (no system FFmpeg needed).  ffprobe is optional —
the engine falls back to parsing ``ffmpeg -i`` output.
"""

import os
import sys

# SPECPATH is provided by PyInstaller as the directory containing this spec.
SPEC_DIR = os.path.abspath(SPECPATH)                           # voiceforge/packaging
PKG_DIR = os.path.dirname(SPEC_DIR)                            # voiceforge/
REPO_DIR = os.path.dirname(PKG_DIR)                            # repo root

IS_WIN = sys.platform.startswith("win")
IS_MAC = sys.platform == "darwin"

# Bundle any binaries dropped into voiceforge/bin (ffmpeg/ffprobe) as data
# files, preserved under a "bin" folder so audio_engine._bundle_dirs finds them.
datas = []
bin_dir = os.path.join(PKG_DIR, "bin")
if os.path.isdir(bin_dir):
    for name in os.listdir(bin_dir):
        if name == ".gitkeep":
            continue
        datas.append((os.path.join(bin_dir, name), "bin"))

block_cipher = None

a = Analysis(
    [os.path.join(SPEC_DIR, "entry.py")],
    pathex=[REPO_DIR],
    binaries=[],
    datas=datas,
    hiddenimports=[
        "voiceforge", "voiceforge.app", "voiceforge.cli", "voiceforge.pipeline",
        "voiceforge.audio_engine", "voiceforge.analysis", "voiceforge.repair",
        "voiceforge.export", "voiceforge.report",
        "soundfile", "librosa", "pyloudnorm", "scipy", "numpy",
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "flask"],
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="VoiceForge",
    debug=False,
    strip=False,
    upx=False,
    console=False,           # windowed GUI app
    disable_windowed_traceback=False,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    name="VoiceForge",
)

if IS_MAC:
    app = BUNDLE(
        coll,
        name="VoiceForge.app",
        icon=None,
        bundle_identifier="ai.voiceforge.app",
        info_plist={
            "CFBundleName": "VoiceForge AI",
            "CFBundleShortVersionString": "1.0.0",
            "NSHighResolutionCapable": True,
        },
    )
