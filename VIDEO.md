# 🎬 自动生成 demo 视频 — 完整流程

## 你已经有的

| 文件 | 说明 |
|------|------|
| `demo-voiceover.aiff` | AI 中文语音（100 秒，Tingting 女声） |
| `demo-voiceover.txt` | 语音逐字稿 |
| `demo-script.md` | 分镜脚本（操作动作） |
| `demo-screenshots/` | 14 张参考截图 |

---

## 一键合成：ffmpeg（最快）

```bash
# 1. 先录屏（无声音，纯画面）
# QuickTime → 文件 → 新建屏幕录制 → 不选麦克风 → 录制
# 跟着 demo-script.md 操作，每页停 6-8 秒
# 保存为 ~/Desktop/demo-video.mov

# 2. 合成 AI 语音到视频
ffmpeg -i ~/Desktop/demo-video.mov \
       -i demo-voiceover.aiff \
       -c:v copy \
       -c:a aac \
       -map 0:v:0 -map 1:a:0 \
       -shortest \
       ~/Desktop/PokerGTO-Demo.mp4

# 完成！输出在 ~/Desktop/PokerGTO-Demo.mp4
```

如果没有 ffmpeg：`brew install ffmpeg`

---

## GUI 方法：iMovie（免费，Mac 自带）

1. 用 QuickTime 录屏（不录声音）→ 保存到桌面
2. 打开 **iMovie** → 新建影片 → 导入录屏文件
3. 把 `demo-voiceover.aiff` 拖到时间轴下方音频轨
4. 拖动对齐画面节奏（参考 `demo-script.md` 的时间分配）
5. 文件 → 导出 → 文件 → 1080p → 保存到桌面

---

## 录屏时怎么跟语音同步？

最佳做法：**边放语音边录屏**

```bash
# 终端 1：先开始播放语音
afplay demo-voiceover.aiff

# 听到"大家好"的瞬间，开始录屏
# 然后跟着 demo-script.md 操作应用
# 语音会自动和你的操作同步
```

这样就不需要后期对齐了。一遍过。

---

## 快速检查

```bash
# 听听语音质量
afplay demo-voiceover.aiff

# 看看截图参考
open demo-screenshots/
```
