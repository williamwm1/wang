# VoiceForge AI — MVP v1.0

一键提升口播人声的本地桌面应用。拖入一个视频，软件自动完成
**提取音频 → AI 降噪 → 人声增强 → EQ → 压缩 → De-esser → 限幅 → 响度归一 → 合成回视频 → 导出**。

目标：让小红书 / 抖音 / B 站 / 播客 / AI 自媒体创作者的成片人声
**明显比原视频更干净、更靠前、更稳定、更适合发布**——不追求录音棚级别，追求稳定提升。

> 本版本 **不包含**：Voice Clone、AI 学声音、多种声音风格、云端模型、
> 在线账号 / 登录、复杂 UI 动画。全部不做。

---

## 功能一览

单页界面：

```
        VoiceForge AI
 ┌─────────────────────────────┐
 │   拖拽视频 / 音频到此处       │
 └─────────────────────────────┘
   [ Analyze ] [ Repair ] [ Export ]
   日志窗口 (Log)
   处理报告 (Report)
```

- **输入格式**：mp4 · mov · wav · mp3（另兼容 mkv/m4a/aac/flac）
- **输出格式**：mp4（视频，视频流直接复制不重编码）· wav（纯音频）
- 输出命名：`原文件名_VoiceForge.mp4`，例如 `video001_VoiceForge.mp4`
- 每次处理生成 `report.txt`

---

## 三个阶段

### 1. Analyze（音频分析）

自动测量：时长、采样率、声道、平均响度 (LUFS)、峰值 (Peak)、动态范围。
自动检测并给出星级评分：

| 检测项 | 说明 |
|--------|------|
| Noise | 宽带底噪 / 嘶声 |
| Room | 房间混响 |
| Sibilance | 齿音（5–8 kHz） |
| Hum | 电流声（50/60 Hz 及谐波） |
| Rumble | 低频轰鸣（<80 Hz） |
| Silence | 静音比例 |
| Clipping | 削波 |

输出一份 `Audio Report` 并给出处理建议。

### 2. Repair（修复，核心）

严格按固定顺序执行，参数以规范默认值为基准、并根据分析结果自动微调：

1. **AI 降噪** — 自动选择：`DeepFilterNet → RNNoise → FFmpeg afftdn`。
   任一环节缺失/失败都会自动降级，**绝不会因为模型缺失导致程序崩溃**。
2. **High-pass** — 默认 75 Hz；检测到轰鸣时自动提升到 90 Hz。
3. **EQ** — 增强 120–180 Hz、削减 250–400 Hz、增强 2–4 kHz、轻微提升 10 kHz。
4. **Compressor** — 3:1，Attack 20 ms，Release 100 ms（稳定口播）。
5. **De-esser** — 5–8 kHz，处理中文齿音，强度随分析结果变化。
6. **Limiter** — True Peak −1 dB。
7. **Loudness** — 目标 −14 LUFS，采用 **真正的两遍 loudnorm 响度归一**（不是简单放大）。

### 3. Export（导出）

视频流原样复制，仅替换为修复后的音频，导出 `*_VoiceForge.mp4`；
纯音频则导出 `*_VoiceForge.wav`。同时写出 `report.txt`。

---

## 安装

```bash
# 1) 系统依赖：FFmpeg（必须，pip 无法安装）
#    Ubuntu:  sudo apt-get install ffmpeg
#    macOS:   brew install ffmpeg

# 2) Python 依赖
pip install -r requirements.txt
```

DeepFilterNet 为可选高质量降噪，未安装时自动使用 afftdn：
```bash
pip install deepfilternet   # 可选
```
RNNoise 备用：把任意 `.rnnn` 模型放到 `voiceforge/assets/` 目录即可自动启用。

---

## 使用

### 图形界面
```bash
python -m voiceforge.app
```
拖入视频 → 点 Analyze → Repair → Export。日志与报告实时显示。

### 命令行（无显示器 / 服务器 / 批处理）
```bash
python -m voiceforge.cli input.mp4 -o output_dir --waveforms
```
`--waveforms` 会额外渲染处理前后的波形对比 PNG。

---

## 项目结构

```
voiceforge/
├── app.py            # PySide6 单页 GUI
├── cli.py            # 命令行入口（含波形截图）
├── pipeline.py       # Analyze→Repair→Export 编排
├── audio_engine.py   # FFmpeg / FFprobe 封装、探测、临时文件
├── analysis.py       # 测量 + 问题检测 + Audio Report
├── repair.py         # 七步 DSP 链 + 降噪降级 + 两遍响度归一
├── export.py         # 合成回视频 / 导出音频
├── report.py         # report.txt 生成
├── ui/  assets/  output/  temp/
├── requirements.txt
└── README.md
```

---

## 验收标准

用同一段视频测试，需提供：原视频、修复后视频、分析报告、前后 LUFS 对比、
前后 Peak 对比、前后波形截图。若试听后无法明显感受到底噪降低 / 人声更靠前 /
声音更稳定，则视为不合格，应继续优化而非增加新功能。

在内置合成测试片段上的实测结果：

| 指标 | Before | After |
|------|--------|-------|
| LUFS | −15.4 | **−14.0**（命中目标） |
| Peak | −3.4 dBFS | −2.7 dBFS（True Peak ≤ −1 dB） |
| Noise ★ | 2 | 1 |
| Rumble ★ | 5 | 3 |
| Sibilance ★ | 5 | 4 |
| Hum ★ | 1 | 0 |

削波片段（Peak 0 dBFS、Clipping ★5）经修复后 Peak 降至 −1.7 dBFS、
Clipping ★0；安静片段（−27 LUFS）被正确抬升到 −14 LUFS。
波形对比可见修复后音节更饱满一致、音节间底噪更干净。
```bash
python -m voiceforge.cli your_video.mp4 --waveforms
```
