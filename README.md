<div align="center">

<img width="100%" alt="openvid Hero" src="./public/images/hero-preview.png" />

# openvid

### Professional screen recording & video editing in your browser

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

[Demo](https://openvid.dev) · [Features](#-features) · [Installation](#-quick-start)

</div>

---

## Features

### Video Input
- **Browser Recording** - Record screen directly in browser using MediaRecorder API
- **Upload Support** - MP4, WebM, QuickTime, and MKV formats
- **Drag & Drop** - Quick video upload via drag and drop

### Visual Customization
**Backgrounds**
- 20+ pre-designed wallpapers
- Custom image upload
- Solid colors & gradients
- Unsplash integration
- Blur effects (0-100%)

**Effects**
- Dynamic padding control
- Rounded corners
- Shadow intensity
- Video rotation & positioning

### Canvas & Elements
- **Shapes** - Rectangles, circles, triangles
- **Text Layers** - Custom fonts, colors, sizes
- **SVG Support** - Import custom vector graphics
- **Image Overlays** - PNG, JPG, WebP
- **Z-axis Control** - Layer management (behind/above video)

### Device Mockups
Browser window frames for professional demos:
- Safari (macOS style)
- Chrome (minimal)
- Arc (modern)

### Smart Zoom
- **Fragment-based** - Zoom in/out at specific timestamps
- **Speed Control** - Customize zoom animation speed
- **Easing Functions** - Smooth transitions

### Audio
- **Multi-track** - Layer multiple audio files
- **Volume Control** - Individual track + master volume
- **Trim & Loop** - Auto-trim to video length
- **Original Audio** - Mute/unmute video audio

### Editing Tools
- **Timeline Scrubbing** - Frame-accurate preview
- **Trim Range** - Cut video start/end
- **Crop Tool** - Resize video dimensions
- **Aspect Ratios** - Auto, 16:9, 9:16, 1:1, 4:3, custom

### Export Options

**Quality Presets**
- 4K (3840×2160) @ 30fps
- 2K (2560×1440) @ 30fps
- 1080p (1920×1080) @ 30fps
- 720p (1280×720) @ 30fps

**Formats**
- MP4 (H.264)
- WebM (VP9)

**Advanced**
- Transparent backgrounds (WebM only)
- Multi-track audio mixing
- Hardware acceleration when available

---

## Authentication

Powered by **Supabase Auth** with OAuth support:

<div align="center">

| Provider | Status |
|:--------:|:------:|
| Google | Supported |
| GitHub | Supported |
| Twitch | Supported |

</div>

User profiles include: avatar, name, email, provider, timestamps

---

## Technology

**Video Processing**
- FFmpeg.wasm (browser-side rendering)
- Canvas API (real-time preview)
- MediaBunny (optimized video pipeline)

**Storage**
- IndexedDB (recorded videos)
- LocalStorage (settings)
- Supabase Storage (future: cloud backups)

**UI/UX**
- Radix UI (accessible components)
- Framer Motion (animations)
- Tailwind CSS 4 (styling)

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Add your Supabase credentials

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|:---------|:-------|
| `Space` | Play / Pause |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `←` / `→` | Skip 5s backward/forward |