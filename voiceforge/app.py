"""
app.py
======
VoiceForge AI — single-window desktop GUI (PySide6).

Layout (top to bottom), exactly one page:

    Title: VoiceForge AI
    [ Drag & drop video here ]      <- drop zone / file picker
    [ Analyze ] [ Repair ] [ Export ]
    Log window
    Processing report

The heavy lifting runs on a worker thread so the UI never freezes; progress is
streamed into the log window via Qt signals.  If PySide6 is unavailable the
module prints guidance to use the CLI (``python -m voiceforge.cli``).
"""

from __future__ import annotations

import os
import sys
import traceback

try:
    from PySide6.QtCore import Qt, QThread, Signal, QObject
    from PySide6.QtGui import QFont, QDragEnterEvent, QDropEvent
    from PySide6.QtWidgets import (
        QApplication, QWidget, QLabel, QPushButton, QVBoxLayout, QHBoxLayout,
        QTextEdit, QFileDialog, QFrame, QPlainTextEdit,
    )
    _HAVE_QT = True
except Exception:  # pragma: no cover
    _HAVE_QT = False

from . import audio_engine as ae
from . import pipeline

SUPPORTED = (".mp4", ".mov", ".wav", ".mp3", ".m4v", ".mkv", ".m4a", ".aac", ".flac")


if _HAVE_QT:

    # ------------------------------------------------------------------ #
    # Worker running a pipeline stage off the UI thread
    # ------------------------------------------------------------------ #
    class Worker(QObject):
        log = Signal(str)
        finished = Signal(str)      # stage name
        failed = Signal(str)

        def __init__(self, stage: str, state: pipeline.PipelineState):
            super().__init__()
            self.stage = stage
            self.state = state

        def run(self):
            try:
                emit = self.log.emit
                if self.stage == "analyze":
                    pipeline.analyze(self.state, log=emit)
                elif self.stage == "repair":
                    pipeline.repair_stage(self.state, log=emit)
                elif self.stage == "export":
                    pipeline.export_stage(self.state, log=emit)
                self.finished.emit(self.stage)
            except Exception as exc:
                self.log.emit(traceback.format_exc())
                self.failed.emit(str(exc))

    # ------------------------------------------------------------------ #
    # Drop zone
    # ------------------------------------------------------------------ #
    class DropZone(QLabel):
        fileDropped = Signal(str)

        def __init__(self):
            super().__init__()
            self.setText("将视频拖拽到此处\n\nDrag & drop video / audio here\n(mp4 · mov · wav · mp3)")
            self.setAlignment(Qt.AlignCenter)
            self.setAcceptDrops(True)
            self.setMinimumHeight(150)
            self.setObjectName("dropzone")

        def dragEnterEvent(self, e: QDragEnterEvent):
            if e.mimeData().hasUrls():
                e.acceptProposedAction()
                self.setProperty("hover", True)
                self.style().polish(self)

        def dragLeaveEvent(self, e):
            self.setProperty("hover", False)
            self.style().polish(self)

        def dropEvent(self, e: QDropEvent):
            self.setProperty("hover", False)
            self.style().polish(self)
            for url in e.mimeData().urls():
                path = url.toLocalFile()
                if path.lower().endswith(SUPPORTED):
                    self.fileDropped.emit(path)
                    break

    # ------------------------------------------------------------------ #
    # Main window
    # ------------------------------------------------------------------ #
    class MainWindow(QWidget):
        def __init__(self):
            super().__init__()
            self.setWindowTitle("VoiceForge AI")
            self.resize(720, 760)
            self.state: pipeline.PipelineState | None = None
            self._thread: QThread | None = None
            self._build_ui()
            self._apply_style()
            if not ae.have_ffmpeg():
                self._log("⚠ FFmpeg 未找到，请先安装 FFmpeg。")

        # -- UI construction ------------------------------------------- #
        def _build_ui(self):
            root = QVBoxLayout(self)
            root.setContentsMargins(24, 20, 24, 20)
            root.setSpacing(14)

            title = QLabel("VoiceForge AI")
            title.setAlignment(Qt.AlignCenter)
            title.setObjectName("title")
            f = QFont()
            f.setPointSize(26)
            f.setBold(True)
            title.setFont(f)
            root.addWidget(title)

            subtitle = QLabel("一键提升人声 · One-click voice repair")
            subtitle.setAlignment(Qt.AlignCenter)
            subtitle.setObjectName("subtitle")
            root.addWidget(subtitle)

            self.drop = DropZone()
            self.drop.fileDropped.connect(self._set_file)
            root.addWidget(self.drop)

            self.file_label = QLabel("未选择文件 · No file selected")
            self.file_label.setAlignment(Qt.AlignCenter)
            self.file_label.setObjectName("filelabel")
            browse = QPushButton("选择文件 · Browse…")
            browse.clicked.connect(self._browse)
            frow = QHBoxLayout()
            frow.addWidget(self.file_label, 1)
            frow.addWidget(browse)
            root.addLayout(frow)

            # action buttons
            self.btn_analyze = QPushButton("Analyze")
            self.btn_repair = QPushButton("Repair")
            self.btn_export = QPushButton("Export")
            for b in (self.btn_analyze, self.btn_repair, self.btn_export):
                b.setMinimumHeight(44)
                b.setObjectName("action")
            self.btn_analyze.clicked.connect(lambda: self._run("analyze"))
            self.btn_repair.clicked.connect(lambda: self._run("repair"))
            self.btn_export.clicked.connect(lambda: self._run("export"))
            brow = QHBoxLayout()
            brow.addWidget(self.btn_analyze)
            brow.addWidget(self.btn_repair)
            brow.addWidget(self.btn_export)
            root.addLayout(brow)

            root.addWidget(self._section_label("日志 · Log"))
            self.logbox = QPlainTextEdit()
            self.logbox.setReadOnly(True)
            self.logbox.setObjectName("log")
            self.logbox.setMinimumHeight(180)
            root.addWidget(self.logbox, 1)

            root.addWidget(self._section_label("处理报告 · Report"))
            self.reportbox = QTextEdit()
            self.reportbox.setReadOnly(True)
            self.reportbox.setObjectName("report")
            self.reportbox.setMinimumHeight(160)
            root.addWidget(self.reportbox, 1)

            self._set_buttons(analyze=False, repair=False, export=False)

        def _section_label(self, text: str) -> QLabel:
            lbl = QLabel(text)
            lbl.setObjectName("section")
            return lbl

        # -- styling --------------------------------------------------- #
        def _apply_style(self):
            self.setStyleSheet("""
                QWidget { background: #14161c; color: #e6e8ee; font-size: 14px; }
                #title { color: #4f9dff; }
                #subtitle { color: #8b93a7; margin-bottom: 4px; }
                #section { color: #8b93a7; font-weight: bold; margin-top: 4px; }
                #dropzone {
                    border: 2px dashed #37507a; border-radius: 12px;
                    color: #9aa3ba; background: #191c24;
                    font-size: 15px;
                }
                #dropzone[hover="true"] { border-color: #4f9dff; background: #1d2330; color: #cfd8ee; }
                #filelabel { color: #b8c0d4; }
                QPushButton {
                    background: #232a38; color: #e6e8ee; border: 1px solid #313a4d;
                    border-radius: 8px; padding: 8px 14px;
                }
                QPushButton:hover { background: #2b3547; }
                QPushButton:disabled { color: #5a6172; background: #1b2029; }
                #action { font-weight: bold; font-size: 15px; }
                #log, #report {
                    background: #0f1116; border: 1px solid #262c39; border-radius: 8px;
                    font-family: monospace; font-size: 13px;
                }
            """)

        # -- helpers --------------------------------------------------- #
        def _log(self, msg: str):
            self.logbox.appendPlainText(msg)
            self.logbox.verticalScrollBar().setValue(
                self.logbox.verticalScrollBar().maximum())

        def _set_buttons(self, analyze: bool, repair: bool, export: bool):
            self.btn_analyze.setEnabled(analyze)
            self.btn_repair.setEnabled(repair)
            self.btn_export.setEnabled(export)

        def _browse(self):
            path, _ = QFileDialog.getOpenFileName(
                self, "选择视频/音频", "",
                "Media (*.mp4 *.mov *.wav *.mp3 *.m4v *.mkv *.m4a *.aac *.flac)")
            if path:
                self._set_file(path)

        def _set_file(self, path: str):
            self.state = pipeline.PipelineState(src=path)
            self.file_label.setText(os.path.basename(path))
            self.reportbox.clear()
            self._log(f"已加载 · Loaded: {path}")
            self._set_buttons(analyze=True, repair=True, export=True)

        # -- stage runner ---------------------------------------------- #
        def _run(self, stage: str):
            if self.state is None:
                self._log("请先选择文件。")
                return
            if not ae.have_ffmpeg():
                self._log("⚠ 未检测到 FFmpeg，无法处理。")
                return
            self._set_buttons(False, False, False)
            self._log(f"▶ {stage} …")

            self._thread = QThread()
            self._worker = Worker(stage, self.state)
            self._worker.moveToThread(self._thread)
            self._thread.started.connect(self._worker.run)
            self._worker.log.connect(self._log)
            self._worker.finished.connect(self._on_finished)
            self._worker.failed.connect(self._on_failed)
            self._worker.finished.connect(self._thread.quit)
            self._worker.failed.connect(self._thread.quit)
            self._thread.start()

        def _on_finished(self, stage: str):
            self._set_buttons(True, True, True)
            if stage == "analyze" and self.state and self.state.before:
                self.reportbox.setPlainText(self.state.before.format_stars())
            elif stage == "export" and self.state and self.state.report_path:
                try:
                    with open(self.state.report_path, encoding="utf-8") as fh:
                        self.reportbox.setPlainText(fh.read())
                except OSError:
                    pass
                self._log(f"✔ 完成 · Output: {self.state.output_path}")

        def _on_failed(self, msg: str):
            self._set_buttons(True, True, True)
            self._log(f"✖ 出错 · Error: {msg}")


def main():
    if not _HAVE_QT:
        print("PySide6 未安装，无法启动图形界面。")
        print("请使用命令行模式：  python -m voiceforge.cli <input>")
        return 1
    app = QApplication(sys.argv)
    win = MainWindow()
    win.show()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
