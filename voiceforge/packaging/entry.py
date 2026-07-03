"""
entry.py
========
PyInstaller entry point for the packaged desktop app.  Kept separate from the
package so the frozen binary launches the GUI directly without ``-m``.
"""

import multiprocessing
import os
import sys


def _main():
    # Allow running the packaged app in CLI mode:  VoiceForge --cli input.mp4
    if "--cli" in sys.argv:
        sys.argv.remove("--cli")
        from voiceforge.cli import main as cli_main
        raise SystemExit(cli_main())
    from voiceforge.app import main as gui_main
    raise SystemExit(gui_main())


if __name__ == "__main__":
    multiprocessing.freeze_support()  # safe no-op on the main path
    _main()
