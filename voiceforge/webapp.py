"""
webapp.py
=========
Browser front-end for VoiceForge AI.

The product ships as a PySide6 desktop app (``app.py``), but on a headless /
remote host there is no display to open that window on.  This module exposes
the *exact same pipeline* over a tiny local web server so the app can be used
from a browser:

    python -m voiceforge.webapp            # serves http://localhost:8000

Endpoints
---------
GET  /                 upload page (drag & drop)
POST /process          run Analyze+Repair+Export on the uploaded file
GET  /files/<name>     download / preview an output file (video, png, report)

Processing is synchronous per request (MVP-appropriate for short clips).
"""

from __future__ import annotations

import io
import os
import time
import uuid
from contextlib import redirect_stdout

from flask import Flask, request, jsonify, send_from_directory, Response

from . import audio_engine as ae
from . import pipeline
from .cli import render_waveform

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 512 * 1024 * 1024  # 512 MB

_BASE = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(_BASE, "temp", "uploads")
OUTPUT_DIR = os.path.join(_BASE, "output")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

ALLOWED = (".mp4", ".mov", ".wav", ".mp3", ".m4v", ".mkv", ".m4a", ".aac", ".flac")


# --------------------------------------------------------------------------- #
# Page
# --------------------------------------------------------------------------- #
INDEX_HTML = r"""<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VoiceForge AI</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; background:#14161c; color:#e6e8ee; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,"PingFang SC","Microsoft YaHei",sans-serif; }
  .wrap { max-width: 860px; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { text-align:center; color:#4f9dff; font-size:34px; margin:8px 0 2px; }
  .sub { text-align:center; color:#8b93a7; margin-bottom:26px; }
  .drop { border:2px dashed #37507a; border-radius:14px; background:#191c24; color:#9aa3ba;
          padding:44px 20px; text-align:center; font-size:16px; cursor:pointer; transition:.15s; }
  .drop.hover { border-color:#4f9dff; background:#1d2330; color:#cfd8ee; }
  .file { text-align:center; color:#b8c0d4; margin:14px 0; min-height:20px; }
  .btn { display:block; width:100%; margin-top:12px; padding:15px; font-size:17px; font-weight:700;
         color:#fff; background:#2b62c9; border:none; border-radius:10px; cursor:pointer; }
  .btn:disabled { background:#2a3446; color:#6b7488; cursor:not-allowed; }
  .btn:hover:not(:disabled){ background:#3570e0; }
  .panel { background:#0f1116; border:1px solid #262c39; border-radius:10px; padding:16px;
           margin-top:20px; font-family:ui-monospace,Menlo,Consolas,monospace; font-size:13px;
           white-space:pre-wrap; max-height:340px; overflow:auto; }
  .section { color:#8b93a7; font-weight:700; margin:22px 0 6px; }
  .cmp { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .cmp figure { margin:0; }
  .cmp figcaption { color:#8b93a7; font-size:13px; margin-bottom:6px; }
  .cmp img { width:100%; border:1px solid #262c39; border-radius:8px; background:#0f1116; }
  video { width:100%; border-radius:8px; margin-top:8px; background:#000; }
  a.dl { color:#4f9dff; text-decoration:none; }
  .stat { display:inline-block; margin-right:18px; }
  .spin { display:none; text-align:center; color:#8b93a7; margin-top:16px; }
  .spin.on { display:block; }
  .hint { color:#6b7488; font-size:12px; text-align:center; margin-top:8px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>VoiceForge AI</h1>
  <div class="sub">一键提升人声 · One-click voice repair</div>

  <div id="drop" class="drop">
    将视频 / 音频拖拽到此处<br><br>
    Drag &amp; drop or click to choose<br>
    <span style="color:#6b7488">mp4 · mov · wav · mp3</span>
  </div>
  <input id="fileInput" type="file" accept=".mp4,.mov,.wav,.mp3,.m4v,.mkv,.m4a,.aac,.flac" style="display:none">
  <div id="fileName" class="file">未选择文件 · No file selected</div>

  <button id="go" class="btn" disabled>Analyze → Repair → Export</button>
  <div class="hint">短视频几秒即可完成；处理在服务器本地运行，不上传云端。</div>

  <div id="spin" class="spin">⏳ 处理中，请稍候… Processing…</div>

  <div id="result" style="display:none">
    <div class="section">结果 · Result</div>
    <div id="stats" class="panel"></div>
    <div id="videoWrap"></div>
    <div class="section">前后波形对比 · Before / After waveform</div>
    <div class="cmp">
      <figure><figcaption>Before</figcaption><img id="wbefore"></figure>
      <figure><figcaption>After</figcaption><img id="wafter"></figure>
    </div>
    <div class="section">处理报告 · Report</div>
    <div id="report" class="panel"></div>
  </div>
</div>

<script>
const drop=document.getElementById('drop'), input=document.getElementById('fileInput'),
      fileName=document.getElementById('fileName'), go=document.getElementById('go'),
      spin=document.getElementById('spin'), result=document.getElementById('result');
let chosen=null;
drop.onclick=()=>input.click();
input.onchange=e=>setFile(e.target.files[0]);
['dragover','dragenter'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('hover');}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('hover');}));
drop.addEventListener('drop',e=>{ if(e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]); });
function setFile(f){ if(!f) return; chosen=f; fileName.textContent=f.name; go.disabled=false; result.style.display='none'; }
go.onclick=async()=>{
  if(!chosen) return;
  go.disabled=true; spin.classList.add('on'); result.style.display='none';
  const fd=new FormData(); fd.append('file',chosen);
  try{
    const r=await fetch('/process',{method:'POST',body:fd});
    const data=await r.json();
    if(!r.ok||data.error){ document.getElementById('stats').textContent='出错: '+(data.error||r.status); result.style.display='block'; return; }
    const s=data.stats;
    document.getElementById('stats').innerHTML=
      `<span class="stat">LUFS: <b>${s.before_lufs}</b> → <b style="color:#4f9dff">${s.after_lufs}</b></span>`+
      `<span class="stat">Peak: <b>${s.before_peak}</b> → <b>${s.after_peak}</b> dBFS</span>`+
      `<span class="stat">耗时: ${s.elapsed}s</span>`+
      `<span class="stat">降噪: ${s.denoise}</span>`;
    const vw=document.getElementById('videoWrap');
    if(data.is_video){ vw.innerHTML=`<video controls src="/files/${data.output}"></video>`+
        `<div style="margin-top:8px"><a class="dl" href="/files/${data.output}" download>⬇ 下载修复后视频 ${data.output}</a></div>`; }
    else { vw.innerHTML=`<audio controls style="width:100%;margin-top:8px" src="/files/${data.output}"></audio>`+
        `<div style="margin-top:8px"><a class="dl" href="/files/${data.output}" download>⬇ 下载修复后音频 ${data.output}</a></div>`; }
    document.getElementById('wbefore').src='/files/'+data.wave_before;
    document.getElementById('wafter').src='/files/'+data.wave_after;
    document.getElementById('report').textContent=data.report;
    result.style.display='block';
  }catch(err){ document.getElementById('stats').textContent='请求失败: '+err; result.style.display='block'; }
  finally{ spin.classList.remove('on'); go.disabled=false; }
};
</script>
</body>
</html>
"""


@app.get("/")
def index() -> Response:
    return Response(INDEX_HTML, mimetype="text/html")


@app.get("/favicon.ico")
def favicon():
    return Response(status=204)


@app.get("/health")
def health():
    return jsonify(ok=True, ffmpeg=ae.have_ffmpeg())


@app.post("/process")
def process():
    if "file" not in request.files:
        return jsonify(error="no file uploaded"), 400
    f = request.files["file"]
    if not f.filename:
        return jsonify(error="empty filename"), 400
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in ALLOWED:
        return jsonify(error=f"unsupported format: {ext}"), 400
    if not ae.have_ffmpeg():
        return jsonify(error="FFmpeg not found on server"), 500

    token = uuid.uuid4().hex[:8]
    safe_stem = "".join(c for c in os.path.splitext(f.filename)[0]
                        if c.isalnum() or c in ("-", "_")) or "clip"
    src = os.path.join(UPLOAD_DIR, f"{token}_{safe_stem}{ext}")
    f.save(src)

    logbuf = io.StringIO()
    try:
        with redirect_stdout(logbuf):
            state = pipeline.run_all(src, out_dir=OUTPUT_DIR, log=lambda m: print(m))

        # waveforms named per-token so concurrent runs don't collide
        before_png = os.path.join(OUTPUT_DIR, f"{token}_before.png")
        after_png = os.path.join(OUTPUT_DIR, f"{token}_after.png")
        render_waveform(src, before_png)
        render_waveform(state.output_path, after_png)

        report_txt = ""
        if state.report_path and os.path.exists(state.report_path):
            with open(state.report_path, encoding="utf-8") as rf:
                report_txt = rf.read()

        return jsonify(
            output=os.path.basename(state.output_path),
            is_video=bool(state.info and state.info.has_video),
            wave_before=os.path.basename(before_png),
            wave_after=os.path.basename(after_png),
            report=report_txt,
            stats=dict(
                before_lufs=f"{state.before.lufs:.1f}",
                after_lufs=f"{state.after.lufs:.1f}",
                before_peak=f"{state.before.peak_dbfs:.1f}",
                after_peak=f"{state.after.peak_dbfs:.1f}",
                elapsed=f"{state.elapsed_s:.1f}",
                denoise=state.repair_result.denoise_method_used,
            ),
        )
    except Exception as exc:  # noqa: BLE001 - surface any failure to the browser
        return jsonify(error=str(exc), log=logbuf.getvalue()[-2000:]), 500
    finally:
        ae.cleanup([src])


@app.get("/files/<path:name>")
def files(name: str):
    return send_from_directory(OUTPUT_DIR, name)


def main():
    host = os.environ.get("VF_HOST", "127.0.0.1")
    port = int(os.environ.get("VF_PORT", os.environ.get("PORT", "8000")))
    print(f"VoiceForge AI web server → http://localhost:{port}")
    if not ae.have_ffmpeg():
        print("⚠ FFmpeg not found on PATH; processing will fail until installed.")
    app.run(host=host, port=port, debug=False, threaded=True)


if __name__ == "__main__":
    main()
