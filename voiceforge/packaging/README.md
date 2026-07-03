# 打包 / 运行 VoiceForge AI 桌面版

有两种方式在**你自己的电脑**上运行（不是远程服务器 —— 所以本机才能打开界面）。

---

## 方式 A：双击启动脚本（最快，需已装 Python 3.9+）

不用编译，脚本会自动建虚拟环境、装依赖、启动界面。第一次运行会花 1–3 分钟装依赖。

| 系统 | 双击这个文件 |
|------|--------------|
| **Windows** | `voiceforge/packaging/run.bat` |
| **macOS** | `voiceforge/packaging/run.command`（第一次需右键 → 打开） |
| **Linux** | `voiceforge/packaging/run.sh` |

> 前提：先把整个仓库下载到本地。没装 Python 的话，去 https://www.python.org/downloads/
> 安装（Windows 记得勾选 “Add Python to PATH”）。

---

## 方式 B：打包成独立 `.exe` / `.app`（双击即用，无需 Python）

产出一个自带 FFmpeg 的独立程序，别人电脑上没有 Python 也能运行。

```bash
python voiceforge/packaging/build.py
```

产物：

| 系统 | 产物 |
|------|------|
| **Windows** | `dist/VoiceForge/VoiceForge.exe` |
| **macOS** | `dist/VoiceForge.app` |
| **Linux** | `dist/VoiceForge/VoiceForge` |

> ⚠ **PyInstaller 不能跨系统编译**：要 `.exe` 必须在 **Windows** 上跑 `build.py`，
> 要 `.app` 必须在 **macOS** 上跑。build.py 会自动安装 PyInstaller 和
> imageio-ffmpeg，并把静态 FFmpeg 打进程序里，所以最终产物**自带 FFmpeg**，
> 目标电脑无需另外安装。

打好后：Windows 把 `dist/VoiceForge/` 整个文件夹拷给用户，双击里面的
`VoiceForge.exe`；macOS 把 `VoiceForge.app` 拖进「应用程序」双击即可。

命令行模式（无界面批处理）：`VoiceForge --cli input.mp4 -o out_dir`

---

## 文件说明

- `entry.py` — 打包入口（默认启动 GUI，带 `--cli` 则走命令行）
- `voiceforge.spec` — PyInstaller 配置，自动把 `voiceforge/bin/` 里的 FFmpeg 一起打包
- `build.py` — 一条命令完成：装依赖 → 内置 FFmpeg → 打包
- `run.bat` / `run.command` / `run.sh` — 免编译的双击启动脚本

## 内置 FFmpeg 说明

程序按 **系统 PATH → 随包 `bin/` 目录 → imageio-ffmpeg** 的顺序查找 FFmpeg；
`ffprobe` 不是必需的（缺失时自动解析 `ffmpeg -i` 输出）。因此打包产物只需带
`ffmpeg` 一个二进制即可完整工作。
