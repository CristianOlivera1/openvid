# Análisis Frontend — Sistema de Zoom en Timeline y Canvas

> Análisis enfocado en cómo se modelan, aplican y renderizan los "zoom fragments" en el editor.
> Cubre: `types/zoom.types.ts`, `ZoomGlobalConfig.tsx`, `ZoomFragmentEditor.tsx`,
> `ZoomFragmentTrackItem.tsx`, `VideoCanvas.tsx`, y utilidades relacionadas
> (`lib/canvas.utils.ts::calculateSmoothZoom`, `lib/video.utils.ts::getZoomMultiplier`,
> `lib/constants.ts::TIMELINE_ZOOM_SCALE`).
>
> **NO incluye** análisis de `openvid-back/` ni `openvid-autozoom/`.

---

## 1. Modelo de datos — `types/zoom.types.ts`

### `ZoomFragment`
Unidad atómica de zoom aplicada a un rango temporal del video:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | `zoom_${Date.now()}_${rand}` |
| `startTime` / `endTime` | number | Ventana temporal (segundos) sobre la que actúa el zoom |
| `zoomLevel` | number (1–10) | Nivel abstracto; se convierte a factor real con `zoomLevelToFactor` |
| `speed` | number (1–10) | Velocidad de transición (1 = lento/2000ms, 10 = rápido/150ms) vía `speedToTransitionMs` |
| `focusX` / `focusY` | number (0–100) | Punto focal en porcentaje del frame |
| `movementEnabled` | boolean? | Activa "cámara" (sub-animación dentro del hold) |
| `movementEndX` / `movementEndY` | number? | Punto B del movimiento |
| `movementStartOffset` / `movementEndOffset` | number? | Offset (s) dentro del hold en el que empieza/termina el movimiento |
| `enable3D` | boolean? | Activa perspectiva 3D (rotateX/rotateY) |
| `perspective3DIntensity` | number? (0–100) | Intensidad del ángulo 3D |
| `perspective3DAngleX` / `perspective3DAngleY` | number? | Ángulos base en grados (rango ±45) |

### Conversión de unidades
- `zoomLevelToFactor(level)` → factor real **1.2× … 4.0×** (lineal).
  - `minZoom=1.2`, `maxZoom=4.0`, `normalized = (level-1)/9`.
- `speedToTransitionMs(speed)` → **150ms … 2000ms** (inverso: speed alta = transición corta).
  - `minMs=150`, `maxMs=2000`, se resta porque a mayor speed menor duración.
- Easings: `easeOutQuart` (entry/exit), `easeInOutQuart` (movement), `ZOOM_EASING = 'cubic-bezier(0.4,0,0.2,1)'` (transición CSS).

### Sistema de 3 fases — `calculateZoomPhaseState(fragment, time, forExport?)`
Particiona la vida del fragmento en **entry → hold → exit** usando `transitionSeconds = speedToTransitionMs(speed)/1000`:

```
|<── entry (T) ──>|<──── hold ────>|<── exit (T) ──>|
startTime                    endTime
```

- **Entry** (`time < startTime + transitionSec`): zoom-in con `easeOutQuart`. Solo `forExport=true` interpola `scale`; en preview el scale lo gestiona `calculateSmoothZoom` (ver §4).
- **Exit** (`time >= endTime - transitionSec`): zoom-out con `easeOutQuart` que termina en `scale=1` exactamente en `endTime`; el foco salta a `movementEndX/Y` si hay movement.
- **Hold** (entre entry y exit): scale = `targetScale`; si `movementEnabled` se interpola foco A→B con `easeInOutQuart`, respetando `movementStartOffset/EndOffset` como ventanas dentro del hold.

> El cálculo del **scale lo hace el caller** según el modo:
> - Preview (CSS): `calculateSmoothZoom` redefine el scale para coincidir con exportación (entry y exit *dentro* del fragmento).
> - Export (canvas): `forExport=true` interpola el scale en entry/exit *dentro* de `calculateZoomPhaseState` porque se llama por frame.

### Capa 3D (independiente del zoom)
Si `enable3D`:
- `intensity = perspective3DIntensity/100`
- `perspective = 500` (fijo para el cálculo de rotateX/Y)
- `maxRotation = 32 * intensity`
- `rotateX = (angleX/45) * maxRotation * smoothOpacity`
- `smoothOpacity` = `easeInOutQuart` de un envelope que sube en entry (=1 en hold) y baja en exit.

### Helpers de factorías
- `createZoomFragment(start, end)`: defaults `zoomLevel=1.5`, `speed=5`, `focusX/Y=50`.
- `generateDefaultZoomFragments(duration)`: 2 fragmentos de 2s en `spacing*0.5` y `spacing*2` (spacing = dur/3).
- `calculateHoldDuration(fragment)`: `duracionTotal - 2*transitionSec`.

---

## 2. Vista global — `ZoomGlobalConfig.tsx`

Panel lateral que **lista todos los fragmentos** (no edita):
- Cada ítem: botón que llama `onSelectFragment(id)` → abre `ZoomFragmentEditor`.
- Muestra rango (`formatZoomTime(start) - formatZoomTime(end)`) y factor (`zoomLevelToFactor(level).toFixed(1)×`).
- Botón "Add" → `onAddFragment()`.
- Footer con atajos: `Delete` (borrar), `Esc` (volver), `Click en track` (crear).

`formatZoomTime(seg)` → `MM:SS` con zero-padding.

---

## 3. Editor del fragmento — `ZoomFragmentEditor.tsx`

Detalles finos de **un** fragmento seleccionado. Es **controlado**: recibe `fragment` y emite `onUpdate(Partial<ZoomFragment>)`.

### 3.1 Preview de punto focal
- Cuadro con `aspectRatio` = dimensiones del video (o 16/9).
- Fondo: thumbnail dinámico vía `getThumbnailForTime(currentTime)` o el `<video>` a opacidad 60%.
- Marca **azul (A)** = `focusX/focusY`, marca **verde (B)** = `movementEndX/Y` (solo si `movementEnabled`).
-Rectángulo del viewport de zoom: `width = height = 100 / zoomLevelToFactor(zoomLevel)%` — visualiza qué porción del frame será visible al aplicar ese factor.
- Drag (`handlePointerDown`) con `pointermove` global y `setPointerCapture`; clamp 0–100.
- Click en el cuadro activa el punto en edición (`editingPoint` 'start'|'end').

### 3.2 Camera movement (toggle)
Al activar (`handleToggleMovement`):
- Calcula `holdDuration = calculateHoldDuration(fragment)`.
- Inicia `movementEndX/Y` desplazados +25% desde el foco (clamp 15–85).
- `movementStartOffset=0`, `movementEndOffset=holdDuration`.

**Timeline del movimiento** (sub-widget dentro del editor):
- Barra con 3 segmentos: `entryPct` | `holdPct` (donde vive el rango movible) | `exitPct`.
- Drag del rango verde ('range') y de sus bordes ('start'/'end') con `minTimeGap = 24px/width * holdDuration`.
- Muestra offsets en segundos (`startOffset.toFixed(1)s`).
- Si `holdDuration <= 0.1` muestra advertencia "too short".

### 3.3 Efecto 3D (toggle, solo si no hay mockup 3D activo via `is3DModelActive`)
- Slider de intensidad (0–100, step 5).
- **Pad direccional** cuadrado: click mapea `(x,y)` normalizado [-1,1] → `angleX = y*45`, `angleY = -x*45`.
- Vista previa en vivo con `perspective(120px) rotateX/rotateY`.
- Un dot gris indica la dirección; si no hay ángulos definidos cae a un fallback basado en `focusX/focusY`.

### 3.4 Effect cleanup
`useEffect` en `is3DModelActive`: si un mockup 3D externo se activa, fuerza `enable3D=false` (mutuamente excluyentes).

### 3.5 Sliders e info
- `zoomLevel` (1–10, step 0.1), `speed` (1–10, step 0.1).
- Resumen: duración, factor (`×`), duración de transición (`s`).

---

## 4. Canvas / Preview — `VideoCanvas.tsx`

Aquí viven **dos cálculos** según el modo:

### 4.1 Preview en vivo (CSS) — `zoomTransform` (líneas 210–248)
`useMemo` que determina el transform CSS del "zoom + translate layer":

1. **Fragmento activo** (`activeZoomFragment`): el que contiene `currentTime` en `[startTime, endTime]`.
2. Si no hay activo: retorna directamente `scale=1` sin transición (el zoom ya completó su exit *dentro* del fragmento anterior, en `endTime`).
3. Si hay activo: llama `calculateZoomPhaseState(fragment, currentTime)` (sin `forExport`) y traducefocus → translate:
   ```
   translateX = 50 - focusX
   translateY = 50 - focusY
   ```
4. `isMoving` = `movementEnabled && phase==='hold'` → transición CSS `linear 50ms` (más fluida); si no, usa `speedToTransitionMs(speed)` con `ZOOM_EASING`.

### 4.2 Exportación (Canvas 2D) — `calculateSmoothZoom` (líneas 1434+ en `VideoCanvas.tsx`, impl en `lib/canvas.utils.ts`)

`calculateSmoothZoom(frameTime, fragments)`:
- `activeFragment`: `frameTime` en `[start,end]`.
  - `scale = computeFragmentScale`: cubre las 3 fases (entry, hold, exit) *dentro* de `[start,end]`. Entry: rampa 1→target con `easeOutQuart` durante `transitionSec` desde `startTime`. Exit: rampa target→1 durante `transitionSec` antes de `endTime`. Hold: `target` constante.
  - Si `isAdvancedZoom` (`enable3D || movementEnabled`) → delega focus/rotateX/rotateY/perspective a `calculateZoomPhaseState(fragment, frameTime, forExport=true)`; **sobreescribe solo `scale`**.
  - Si no → focusX/Y del fragmento, rotación 0.
- Default: scale 1, sin rotación. (Ya no hay `previousFragment`/`computeExitScale` porque el exit completa dentro del fragmento.)

### 4.3 Transform CSS aplicado al DOM (líneas 2242–2320)
Estructura anidada:

```
<div perspective-container>  (perspective para el 3D del mockup en image-mode)
  <div zoom+translate layer>
    transform: scale(scale) translate(translateX%, translateY%)
             | (image+apply3DToBackground) rotateX/Y/Z*.. scale(scale*zscale)
    perspective: (state.perspective>0) ? `${perspective/10.8}cqh` : none
    transition: isMoving ? linear 50ms
              : `transform ${transitionMs}ms cubic-bezier(0.4,0,0.2,1)`
    <div 3D-rotation layer>  (solo si perspective>0)
      transform: rotateX/rotateY
      transition: `transform ${transitionMs}ms ${ZOOM_EASING}`
      <div video-container>
        vídeo / mockup / media
```

- **Capa zoom+translate** envuelve fondo + elementos canvas + mockup → el zoom afecta a toda la composición.
- **Sub-capa 3D** separa la rotación del mockup para que el fondo no herede la rotación 3D generada por el zoom.
- `cqh` (container query height) escala la perspectiva con el contenedor.

### 4.4 Render a `<canvas>` de export (líneas 1667–1756)
Implementación manual en Canvas 2D:

- `zoomCenterX/Y = canvasWidth/Height / 2` (centro del frame).
- `focusPxX = (focusX/100) * canvasWidth`.
- **Pivot**: si `hasZoom && targetScale>1`:
  ```
  pivot = (targetScale * focusPx - zoomCenter) / (targetScale - 1)
  ```
  garantiza identidad en `scale=1` y anclaje del foco al centro en `scale=target`.
- `applyVideoZoom(ctx)`:
  ```
  ctx.translate(pivot, pivot)
  ctx.scale(zoomState.scale, zoomState.scale)
  ctx.translate(-pivot, -pivot)
  ```
- **3D**: si `has3DEffect` (perspective>0 y rotación ≠0):
  - Renderiza mockup+media a un canvas auxiliar con `BLEED_FACTOR=1.5` (25% extra por lado para evitar clipping en la rotación).
  - `applyPerspective3D(fgCanvas, rotateX, rotateY, perspective/BLEED_FACTOR)`.
  - Compone con `applyVideoZoom(ctx)` + `drawImage(fgCanvas, -offsetX, -offsetY)`.
- En `imagePhoneActive` (mockup 3D externo activo) deriva a `drawPhone3DCompositeWithZoom`.

### 4.5 Ctrl+scroll handlers (líneas 434–466)
- En modo imagen con overlay 3D activo: ajusta `imagePhoneScale` (0.3–3) con badge temporal.
- En modo video: ajusta `padding` (0–30) vía `onPaddingChange`, throttleado con `requestAnimationFrame` y `pendingPaddingRef`.
- Handler atado **no-pasivo** (`el.addEventListener('wheel', handler, {passive:false})`) envuelto en un `useEffect` setup-once; el handler real vive en un `ref` que se actualiza cada render para capturar estado fresco sin re-atachar.

---

## 5. Timeline — drag/drop de fragments (`Timeline.tsx` + `ZoomFragmentTrackItem.tsx`)

### 5.1 Zoom del track (viewport horizontal) — distinto del zoom de fragmentos
El timeline tiene su **propio** `zoomLevel` (prop) que solo controla cuánto se "estira" horizontalmente la pista:

- `contentWidth = (trackWidth - padding) * getZoomMultiplier(zoomLevel)` (`Timeline.tsx:85-89`).
- `getZoomMultiplier(zoom)` (`lib/video.utils.ts:79`) → `TIMELINE_ZOOM_SCALE[round(clamp(1..10,zoom))]`.
- `TIMELINE_ZOOM_SCALE` (`lib/constants.ts:40-51`):
  ```
  1:1.0  2:1.2  3:1.4  4:1.6  5:1.8
  6:2.0  7:2.1  8:2.2  9:2.35 10:2.5
  ```
- Intervalo de marcadores de tiempo: `baseInterval / sqrt(getZoomMultiplier(zoomLevel))` (más denso al hacer zoom).
- `dragConstraints={{left:0, right: contentWidth/speed}}` — el `speed` del `globalSpeed` reescala el ancho usable.

> **Dos "zoom" distintos, no confundir**: el `zoomLevel` del timeline = zoom horizontal del viewport; el `zoomLevel` del `ZoomFragment` = factor de zoom dentro del video. Tienen el mismo tipo de dato (1–10) pero propósito independiente.

### 5.2 Conversión time↔pixels (`ZoomFragmentTrackItem.tsx`)
- `timeToPixels(t) = (t / videoDuration) * contentWidth`
- `pixelsToTime(px) = (px / contentWidth) * videoDuration`
- Notar que el ítem recibe `videoDuration` como `scaledDuration` = `validDuration * globalSpeed` (el rastro temporal está en espacio "scaled"), y `contentDuration` = `validDuration` (para clamp de bordes). El `speed` prop = `globalSpeed`.

### 5.3 Estado de drag — `useMotionValue`
- `fragmentX`, `fragmentWidth`: motion values (decoupled de React state para performance).
- `useEffect` resincroniza `fragmentX/Width` a `initialLeft/initialWidth` cuando NO se está arrastrando (cambio externo de `zoomLevel` del track recomputea `contentWidth` y reubica el ítem sin drag).

### 5.4 Boundaries (colisión con otros fragmentos)
`boundaries` (`useMemo`): ordena `otherFragments` por `startTime` y calcula:
- `minStart` = endTime del fragmento inmediatamente anterior (o 0).
- `maxEnd` = startTime del fragmento inmediatamente siguiente (o `contentDuration ?? videoDuration`).

→ Mantiene fragmentos **no solapados** durante drag/resize.

### 5.5 Drag del cuerpo (`handleDrag`)
- Acumula `delta.x` sobre `fragmentX` actual.
- Clampea a `[minX, maxX]` = `[timeToPixels(minStart), timeToPixels(maxEnd - duration)]`.
- Al soltar (`handleDragEnd`): convierte a tiempo y emite `onUpdate({startTime, endTime})` con clamp a `[0, contentDuration ?? videoDuration]`.

### 5.6 Resize handles (start/end)
- **Start** (`handleResizeStartDrag`): mueve `fragmentX` y reduce `fragmentWidth`; respeta `MIN_FRAGMENT_DURATION = 0.5s` (mínimo ancho en pixels) y `boundaries.minStart`.
- **End** (`handleResizeEndDrag`): solo `fragmentWidth += delta.x`; clamp por `minWidth` y por `boundaries.maxEnd` (no pasarse del siguiente fragmento).
- Al soltar: traduce a `startTime/endTime` y emite `onUpdate`.

Framer Motion: `drag="x"`, `dragElastic={0}`, `dragMomentum={false}` — comportamiento determinista (sin inercia).

### 5.7 Helpers de layout en el track
- `canAddFragmentAt(start, end, existing, excludeId?)`: retorna `false` si se solapa con alguno.
- `findAllGaps(existing, videoDuration, minDuration)`: lista de ventanas libres aptas para un nuevo fragmento (incluye bordes 0 y `videoDuration`).
- `findValidFragmentPosition(clickTime, defaultDuration, existing, videoDuration)`:
  - Busca gap que contenga `clickTime`.
  - Si no, elige el gap más cercano (min distancia a start/centro/end).
  - Ajusta `startTime/endTime` para que el fragmento quepa centrado en `clickTime` sin salirse del gap.
  - `DEFAULT_ZOOM_FRAGMENT_DURATION = 2` en `Timeline.tsx`.

### 5.8 Ghost preview (Timeline.tsx ~560-630)
- `onMouseEnter` en la row activa `isHoveringZoomRow`.
- `onMouseMove` calcula `ghostX` throttleado con `requestAnimationFrame`.
- `ghostState.validPosition` (resultado de `findValidFragmentPosition`) renderiza un placeholder **azul** (`+ Zoom`) o **rojo** (`noSpace`) si no hay espacio.
- `onClick` solo crea si NO se está sobre un fragmento existente y NO se está arrastrando: `onAddZoomFragment(start, end)`.

### 5.9 Accesibilidad
Cada `ZoomFragmentTrackItem` expone `role="slider"` con `aria-valuemin/max/now` y `aria-label` describiendo factor y duración (`{(duration/speed).toFixed(1)}s`); los resize handles también son sliders individuales.

---

## 6. Flujo end-to-end del zoom

1. **Creación**: click en row de zoom del timeline → `Timeline` calcula posición válida → `onAddZoomFragment(start,end)` → editor page (no cubierto aquí) push de `createZoomFragment` al state global de fragments.
2. **Selección**: click en ítem del track o en `ZoomGlobalConfig` → `selectedZoomFragmentId` → monta `ZoomFragmentEditor`.
3. **Edición**: sliders/drag/pad direccional emiten `onUpdate(Partial<ZoomFragment>)`; el estado vive en el padre y se propaga a `Timeline` y `VideoCanvas` por props.
4. **Preview**: `VideoCanvas.activeZoomFragment` → `zoomTransform` → CSS `transform: scale(...) translate(...%)` + capa 3D opcional; transición con `ZOOM_EASING` o `linear 50ms` en movement.
5. **Exportación**: `VideoCanvas.drawFrame` (line ~1434) llama `calculateSmoothZoom(frameTime, fragments)` para obtener `{scale, focusX/Y, rotateX/Y, perspective}`, calcula pivot, aplica `ctx.translate/scale` (y `applyPerspective3D` si hace falta), renderiza fondo + elementos + mockup + media.
6. **Salida suave entre fragments**: si no hay fragmento activo, `calculateSmoothZoom` usa el anterior para decaer scale 1 con la misma curva de su `speed` (evita saltos).

---

## 7. Invariantes y notas de implementación

- **No solapamiento**: garantizado por `boundaries` (drag/resize) y `canAddFragmentAt`/`findValidFragmentPosition` (creación).
- **Dualidad preview/export**: `calculateZoomPhaseState(forExport)` interpola scale *dentro* del fragmento (entry dentro, exit dentro del endTime). `calculateSmoothZoom` redefine el scale para que el exit ocurra *después* del endTime, alineando con el sobre CSS en preview. El diff se documenta en `lib/canvas.utils.ts:194-204`.
- `focusX/focusY` son porcentajes 0–100; en canvas se convierten a píxeles con `canvasWidth/Height`. En CSS se traducen a `translate(% )` relativo al propio elemento.
- `perspective` en cálculo (=500 fijo) ≠ `perspective` en CSS (>0 implica `perspective/10.8cqh`) ≠ `perspective` en export (dividido por `BLEED_FACTOR=1.5`).
- `easeOutQuart`/`easeInOutQuart` comparten lógica de curvas cuárticas para sensación "profesional".
- 3D y mockup 3D externo son **mutuamente excluyentes**: `ZoomFragmentEditor` desactiva `enable3D` si `is3DModelActive`.
- Mínimo fragmento: `MIN_FRAGMENT_DURATION = 0.5s`. Default de creación: `DEFAULT_ZOOM_FRAGMENT_DURATION = 2s`.
- `dragMomentum=false` y `dragElastic=0` en todos los drag del track: comportamiento tipo editor (sin física), esencial cuando `zoomLevel` del timeline escala el ancho y la inercia desbordaría los bounds.

---

## 8. Referencias rápidas

| Símbolo | Ubicación |
|---|---|
| `ZoomFragment`, `calculateZoomPhaseState` | `types/zoom.types.ts:3,61` |
| `zoomLevelToFactor`, `speedToTransitionMs` | `types/zoom.types.ts:253,262` |
| `ZoomStateCanvasExport`, `calculateSmoothZoom` | `lib/canvas.utils.ts:185,205` |
| `getZoomMultiplier`, `TIMELINE_ZOOM_SCALE` | `lib/video.utils.ts:79`, `lib/constants.ts:40` |
| `zoomTransform` (preview CSS) | `app/components/ui/editor/VideoCanvas.tsx:210` |
| Aplicación CSS del zoom | `VideoCanvas.tsx:2242-2320` |
| Render export con pivot + `applyVideoZoom` | `VideoCanvas.tsx:1667-1756` |
| Ctrl+scroll wheel (padding / imagePhone scale) | `VideoCanvas.tsx:434-476` |
| `ZoomFragmentTrackItem` drag/resize/boundaries | `app/components/ui/editor/ZoomFragmentTrackItem.tsx` |
| `canAddFragmentAt`, `findValidFragmentPosition` | `ZoomFragmentTrackItem.tsx:280,330` |
| Row de zoom + ghost preview + add | `app/components/ui/editor/Timeline.tsx:560-630` |
| `ZoomGlobalConfig` lista de fragmentos | `app/components/ui/editor/ZoomGlobalConfig.tsx` |
| `ZoomFragmentEditor` (foco, movement, 3D) | `app/components/ui/editor/ZoomFragmentEditor.tsx` |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
