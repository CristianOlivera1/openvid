<div align="center">
   <img width="60%" alt="openvid Hero" src="https://openvid.dev/images/pages/openvid-animation.svg" />

  ### Create professional demos and mockups in seconds, directly in your browser
  **Record your screen or upload a video, add smooth zooms, device mockups, 3D effects, and custom backgrounds - export a cinematic demo.**

  [Live Demo](https://openvid.dev) • [Features](#-features) • [Installation](#-quick-start) • [Discord Community](https://discord.gg/aBu5A2tBXb)
</div>

<div align="center">
  <a href="https://www.youtube.com/watch?v=BreTDBD_pGY" target="_blank">
    <img src="https://github.com/user-attachments/assets/82a82dc8-ce81-4d78-829e-12c9ef096758">
  </a>
  <br>
</div>

<img width="1890" height="1318" alt="Frame 1116606714 (1)" src="https://github.com/user-attachments/assets/a8ef1f0a-af93-461f-ab27-b890e17bf6b9" />

## Features

### Video Input
- **Screen recording** - Capture your screen directly in the browser with no installation required
- **Upload your video** - MP4, WebM, QuickTime, and MKV
- **Drag & drop** - Fast file upload

---

### Mockup Creation
- **Mockups applied to images**
- **3D transformations**
- **Image masking (Mask Image)** for advanced cutouts
- Scale, rotation, perspective, and position adjustments

---

### Visual Customization

**Backgrounds**
- 100+ pre-designed backgrounds
- Custom images or Unsplash
- Solid colors and gradients
- Blur effect (0–100%)

**Effects**
- Dynamic padding
- Rounded corners
- Shadows
- Video rotation and positioning

---

### Canvas & Elements
- **Shapes** - Rectangles, circles, triangles
- **Text** - Custom fonts, colors, and sizes
- **SVG** - Import vector graphics
- **Images** - PNG, JPG, WebP overlays
- **Layers** - Depth control above or below the video

---

### Device Mockups
Add context to your demo with professional frames:
- Safari (macOS)
- Chrome
- Arc
- Samsung

---

### Zoom
- Zoom in/out at specific timeline moments
- Speed and easing control
- **3D Camera Movement** - Tilt and dynamic rotation based on points of interest
- **Adjustable Perspective** - Full control over X and Y axes for depth simulation

---

### Audio
- Multi-track support
- Per-track and master volume control
- Auto-trim based on video duration
- Toggle original video audio

---

### Export

**Quality**
- 4K (3840×2160) @ 30fps
- 2K (2560×1440) @ 30fps
- 1080p (1920×1080) @ 30fps
- 720p (1280×720) @ 30fps
- 480p (720×480) @ 24fps

**Format**
- MP4 (H.264)
- WebM (VP9 with transparent background support)
- GIF
- PNG, WEBP, JPG, AVIF

---

## Technology

**Video Processing**
- FFmpeg.wasm - fully in-browser rendering
- Canvas API - preview
- MediaBunny - optimized video pipeline
- Three.js - 3D effects
- HTML to Image - mockup export

**Storage**
- IndexedDB - locally recorded videos
- LocalStorage - user settings
- Supabase Storage - cloud backups (coming soon)

**UI/UX**
- Radix UI - accessible components
- Framer Motion - animations
- Tailwind CSS 4 - styling

---

## Quick Start
```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Add your Supabase credentials

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Docker Compose
```bash
docker compose up --build
```

Open [http://localhost:5001](http://localhost:5001)

Docker mounts the project directory into the container, so you can edit code locally and see changes in the running app.

---

## 💬 Community

¡Contributions are welcome! Join our **Discord** to collaborate: [![Discord](https://img.shields.io/badge/Discord-Join%20Chat-5865F2?logo=discord&logoColor=white)](https://discord.gg/aBu5A2tBXb)

[![oosmetrics](https://api.oosmetrics.com/api/v1/badge/achievement/0035870f-b4f4-4b12-9a1c-bef97b6785af.svg)](https://oosmetrics.com/repo/CristianOlivera1/openvid)
  
## Contributors
<a href="https://github.com/CristianOlivera1/openvid/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=CristianOlivera1/openvid" />
</a>

## Star History
[![Star History Chart](https://api.star-history.com/chart?repos=CristianOlivera1/openvid&type=date&legend=top-left)](https://www.star-history.com/?repos=CristianOlivera1/openvid&type=date&legend=top-left)
