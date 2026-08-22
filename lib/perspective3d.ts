import * as THREE from "three";

let _renderer: THREE.WebGLRenderer | null = null;
let _scene: THREE.Scene | null = null;
let _camera: THREE.PerspectiveCamera | null = null;
let _plane: THREE.Mesh | null = null;
let _material: THREE.MeshBasicMaterial | null = null;
let _texture: THREE.Texture | null = null;
let _lastAspect = 0;
let _lastCanvasWidth = 0;
let _lastCanvasHeight = 0;

function buildRenderer(pixelRatio: number = window.devicePixelRatio || 1): THREE.WebGLRenderer {
  const r = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    premultipliedAlpha: true,
  });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.NoToneMapping;
  r.setClearColor(0x000000, 0);

  r.setPixelRatio(pixelRatio);

  return r;
}

function ensureScene(aspect: number, renderer: THREE.WebGLRenderer): { scene: THREE.Scene; plane: THREE.Mesh } {
  if (!_scene) {
    _scene = new THREE.Scene();
  }

  if (!_texture) {
    _texture = new THREE.Texture();
    _texture.colorSpace = THREE.SRGBColorSpace;
    _texture.generateMipmaps = false;
    _texture.minFilter = THREE.LinearFilter;
    _texture.magFilter = THREE.LinearFilter;
    _texture.wrapS = THREE.ClampToEdgeWrapping;
    _texture.wrapT = THREE.ClampToEdgeWrapping;
    _texture.premultiplyAlpha = false;

    _texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }

  if (!_material) {
    _material = new THREE.MeshBasicMaterial({
      map: _texture,
      transparent: true,
      side: THREE.FrontSide,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor
    });
    _material.premultipliedAlpha = false;
  }

  if (!_plane || Math.abs(_lastAspect - aspect) > 0.0001 || _lastCanvasWidth !== renderer.domElement.width || _lastCanvasHeight !== renderer.domElement.height) {
    if (_plane) {
      _plane.geometry.dispose();
      _scene.remove(_plane);
    }
    const geo = new THREE.PlaneGeometry(2 * aspect, 2);
    _plane = new THREE.Mesh(geo, _material);
    _scene.add(_plane);
    _lastAspect = aspect;
    _lastCanvasWidth = renderer.domElement.width;
    _lastCanvasHeight = renderer.domElement.height;
  }

  return { scene: _scene, plane: _plane };
}

export function applyPerspective3D(
  canvas: HTMLCanvasElement,
  rotateXDeg: number,
  rotateYDeg: number,
  perspectivePx: number
): void {
  if (rotateXDeg === 0 && rotateYDeg === 0) return;
  if (typeof window === "undefined") return;

  const w = canvas.width;
  const h = canvas.height;
  if (w === 0 || h === 0) return;
  const aspect = w / h;
  const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  if (!_renderer) {
    _renderer = buildRenderer(pixelRatio);
  } else if (_renderer.getPixelRatio() !== pixelRatio) {
    _renderer.setPixelRatio(pixelRatio);
  }
  if (_renderer.domElement.width !== w || _renderer.domElement.height !== h) {
    _renderer.setSize(w, h, false);
  }

  const { scene, plane } = ensureScene(aspect, _renderer);

  _texture!.image = canvas;
  _texture!.needsUpdate = true;

  const referenceHeight = h;
  const cameraZ = (2 * perspectivePx) / referenceHeight;
  const fovDeg = (2 * Math.atan(1 / cameraZ) * 180) / Math.PI;

  if (!_camera) {
    _camera = new THREE.PerspectiveCamera(fovDeg, aspect, 0.001, cameraZ * 20);
  } else {
    _camera.fov = fovDeg;
    _camera.aspect = aspect;
    _camera.near = 0.001;
    _camera.far = cameraZ * 20;
  }
  _camera.position.set(0, 0, cameraZ);
  _camera.lookAt(0, 0, 0);
  _camera.updateProjectionMatrix();

  plane.rotation.x = -(rotateXDeg * Math.PI) / 180;
  plane.rotation.y = (rotateYDeg * Math.PI) / 180;
  plane.rotation.z = 0;

  _renderer.render(scene, _camera);

  const ctx2d = canvas.getContext("2d", { alpha: true, willReadFrequently: false })!;
  ctx2d.imageSmoothingEnabled = true;
  ctx2d.imageSmoothingQuality = 'high';

  ctx2d.clearRect(0, 0, w, h);
  ctx2d.drawImage(_renderer.domElement, 0, 0);
}

export function disposePerspective3D(): void {
  _texture?.dispose();
  _material?.dispose();
  if (_plane) {
    _plane.geometry.dispose();
  }
  _renderer?.dispose();
  _renderer = null;
  _scene = null;
  _camera = null;
  _plane = null;
  _material = null;
  _texture = null;
  _lastAspect = 0;
  _lastCanvasWidth = 0;
  _lastCanvasHeight = 0;
}