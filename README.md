<div align="center">
<img width="50%" alt="openvid Hero" src="https://openvid.dev/images/pages/openvid.svg" />

### Crea demos profesionales en segundos, directamente en tu navegador

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

**Graba tu pantalla o sube un video, añade zooms suaves, mockups de dispositivo y fondos personalizados - exporta un demo cinematográfico listo para compartir.**

[Demo en vivo](https://openvid.dev) · [Funcionalidades](#-funcionalidades) · [Instalación](#-inicio-rápido) · [Comunidad en Discord](https://discord.gg/f8KEyceS)

</div>

> **El siguiente demo fue grabado y editado completamente con openvid.**

<div align="center">
  <video src="https://github.com/user-attachments/assets/7f5219db-c8e4-4143-a3d7-81e2bde24239" width="100%">
    Tu navegador no admite el elemento de video.
  </video>
</div>

---

## Funcionalidades

### Entrada de video
- **Grabación de pantalla** - Captura tu pantalla directamente en el navegador sin instalar nada
- **Sube tu video** - MP4, WebM, QuickTime y MKV
- **Arrastrar y soltar** - Carga rápida por drag & drop

### Personalización visual

**Fondos**
- Más de 100 fondos prediseñados
- Imagen personalizada o desde Unsplash
- Colores sólidos y degradados
- Efecto blur (0–100%)

**Efectos**
- Padding dinámico
- Esquinas redondeadas
- Sombras
- Rotación y posicionamiento del video

### Canvas y elementos
- **Figuras** - Rectángulos, círculos, triángulos
- **Texto** - Fuentes, colores y tamaños personalizados
- **SVG** - Importa gráficos vectoriales
- **Imágenes** - PNG, JPG, WebP como overlay
- **Capas** - Control de profundidad detrás o encima del video

### Mockups de dispositivo
Dale contexto a tu demo con marcos profesionales:
- Safari (macOS)
- Chrome
- Arc
- Samsung

### Zoom
- Zoom en/out en momentos exactos del video
- Control de velocidad y suavizado de la transición
- **Movimiento de Cámara 3D** - Inclinación (Tilt) y rotación dinámica basada en puntos de interés.
- **Perspectiva Ajustable** - Control total sobre los ejes X e Y para simular profundidad espacial.

### Audio
- Multipista - añade música o efectos de sonido
- Control de volumen por pista y maestro
- Recorte automático según duración del video
- Silenciar/activar audio original del video

### Herramientas de edición
- Scrubbing cuadro a cuadro en la línea de tiempo
- Recorte de inicio y fin
- Herramienta de crop
- Proporciones: Auto, 16:9, 9:16, 1:1, 4:3 y personalizado

### Exportación

**Calidad**
- 4K (3840×2160) @ 30fps
- 2K (2560×1440) @ 30fps
- 1080p (1920×1080) @ 30fps
- 720p (1280×720) @ 30fps
- 480p (720×480) @ 24fps

**Formato**
- MP4 (H.264)
- WebM (VP9) con soporte de fondo transparente
- GIF

---

## Autenticación

Impulsado por **Supabase Auth** con soporte OAuth:

<div align="center">

| Proveedor | Estado |
|:---------:|:------:|
| Google    | ✅ Soportado |
| GitHub    | ✅ Soportado |
| Twitch    | ✅ Soportado |

</div>

---

## Tecnología

**Procesamiento de video**
- FFmpeg.wasm - renderizado completamente en el navegador
- Canvas API - vista previa en tiempo real
- MediaBunny - pipeline de video optimizado

**Almacenamiento**
- IndexedDB - videos grabados localmente
- LocalStorage - configuraciones del usuario
- Supabase Storage - copias en la nube (próximamente)

**UI/UX**
- Radix UI - componentes accesibles
- Framer Motion - animaciones
- Tailwind CSS 4 - estilos

---

## Inicio rápido
```bash
# Instalar dependencias
pnpm install

# Configurar entorno
cp .env.example .env
# Agrega tus credenciales de Supabase

# Iniciar servidor de desarrollo
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 💬 Comunidad
¡Cualquier contribución es bienvenida! Únete a nuestro servidor de **Discord** para coordinar ideas:
[Únete a Discord](https://discord.gg/f8KEyceS)

## Contribuidores
<a href="https://github.com/CristianOlivera1/openvid/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=CristianOlivera1/openvid" />
</a>
