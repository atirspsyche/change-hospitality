import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl';
import { useEffect, useRef } from 'react';

type GL = Renderer['gl'];

interface GalleryItem {
  image: string;
  text: string;
}

interface ScreenSize {
  width: number;
  height: number;
}

interface Viewport {
  width: number;
  height: number;
}

interface CircularGalleryProps {
  items?: GalleryItem[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  font?: string;
  fontUrl?: string;
  scrollSpeed?: number;
  scrollEase?: number;
}

function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: number;
  return function (this: any, ...args: Parameters<T>) {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => func.apply(this, args), wait);
  };
}

function lerp(left: number, right: number, amount: number): number {
  return left + (right - left) * amount;
}

function autoBind(instance: any): void {
  const proto = Object.getPrototypeOf(instance);
  Object.getOwnPropertyNames(proto).forEach(key => {
    if (key !== 'constructor' && typeof instance[key] === 'function') instance[key] = instance[key].bind(instance);
  });
}

const DEFAULT_FONT = '700 28px Plus Jakarta Sans';

function resolveColor(color: string): string {
  if (!color.includes('var(') && !color.includes('color-mix(')) return color;
  const probe = document.createElement('span');
  probe.style.color = color;
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  document.body.appendChild(probe);
  const resolved = window.getComputedStyle(probe).color;
  probe.remove();
  return resolved || color;
}

function getFontSize(font: string): number {
  const match = font.match(/(\d+)px/);
  return match ? parseInt(match[1], 10) : 28;
}

async function loadFont(font: string, fontUrl?: string): Promise<string> {
  if (fontUrl) {
    const familyName = fontUrl.includes('fonts.googleapis.com') ? 'Plus Jakarta Sans' : 'CircularGalleryFont';
    if (fontUrl.includes('fonts.googleapis.com') || /\.css(\?.*)?$/i.test(fontUrl)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontUrl;
      document.head.appendChild(link);
    } else if ('FontFace' in window) {
      const face = new FontFace(familyName, `url(${fontUrl})`);
      await face.load();
      document.fonts.add(face);
      return font.replace(/([^\s]+)$/u, `"${familyName}"`);
    }
  }

  if (document.fonts?.load) {
    try {
      await document.fonts.load(font);
      await document.fonts.ready;
    } catch {
      return font;
    }
  }
  return font;
}

function createTextTexture(gl: GL, text: string, font: string, color: string): { texture: Texture; width: number; height: number } {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get 2d context');

  context.font = font;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const fontSize = getFontSize(font);
  const textHeight = Math.ceil(fontSize * 1.25);

  canvas.width = textWidth + 24;
  canvas.height = textHeight + 20;

  context.font = font;
  context.fillStyle = resolveColor(color);
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

class Title {
  gl: GL;
  plane: Mesh;
  text: string;
  textColor: string;
  font: string;
  mesh!: Mesh;

  constructor({ gl, plane, text, textColor, font }: { gl: GL; plane: Mesh; text: string; textColor: string; font: string }) {
    autoBind(this);
    this.gl = gl;
    this.plane = plane;
    this.text = text;
    this.textColor = textColor;
    this.font = font;
    this.createMesh();
  }

  createMesh() {
    const { texture, width, height } = createTextTexture(this.gl, this.text, this.font, this.textColor);
    const geometry = new Plane(this.gl);
    const program = new Program(this.gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true,
    });
    this.mesh = new Mesh(this.gl, { geometry, program });
    const aspect = width / height;
    const textHeightScaled = this.plane.scale.y * 0.13;
    this.mesh.scale.set(textHeightScaled * aspect, textHeightScaled, 1);
    this.mesh.position.y = -this.plane.scale.y * 0.5 - textHeightScaled * 0.6;
    this.mesh.setParent(this.plane);
  }
}

class Media {
  extra = 0;
  geometry: Plane;
  gl: GL;
  image: string;
  index: number;
  length: number;
  scene: Transform;
  screen: ScreenSize;
  text: string;
  viewport: Viewport;
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
  program!: Program;
  plane!: Mesh;
  scale!: number;
  padding!: number;
  width!: number;
  widthTotal!: number;
  x!: number;
  speed = 0;
  isBefore = false;
  isAfter = false;

  constructor({
    geometry,
    gl,
    image,
    index,
    length,
    scene,
    screen,
    text,
    viewport,
    bend,
    textColor,
    borderRadius,
    font,
  }: {
    geometry: Plane;
    gl: GL;
    image: string;
    index: number;
    length: number;
    scene: Transform;
    screen: ScreenSize;
    text: string;
    viewport: Viewport;
    bend: number;
    textColor: string;
    borderRadius: number;
    font: string;
  }) {
    this.geometry = geometry;
    this.gl = gl;
    this.image = image;
    this.index = index;
    this.length = length;
    this.scene = scene;
    this.screen = screen;
    this.text = text;
    this.viewport = viewport;
    this.bend = bend;
    this.textColor = textColor;
    this.borderRadius = borderRadius;
    this.font = font;
    this.createShader();
    this.createMesh();
    this.createTitle();
    this.onResize();
  }

  createShader() {
    const texture = new Texture(this.gl, { generateMipmaps: false });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = sin(p.x * 3.0 + uTime) * 0.08 * (1.0 + abs(uSpeed));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;

        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }

        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(vUv.x * ratio.x + (1.0 - ratio.x) * 0.5, vUv.y * ratio.y + (1.0 - ratio.y) * 0.5);
          vec4 color = texture2D(tMap, uv);
          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          float alpha = 1.0 - smoothstep(-0.002, 0.002, d);
          gl_FragColor = vec4(color.rgb, alpha);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [1, 1] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius },
      },
      transparent: true,
    });

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = this.image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  }

  createMesh() {
    this.plane = new Mesh(this.gl, { geometry: this.geometry, program: this.program });
    this.plane.setParent(this.scene);
  }

  createTitle() {
    new Title({ gl: this.gl, plane: this.plane, text: this.text, textColor: this.textColor, font: this.font });
  }

  update(scroll: { current: number; last: number }, direction: 'right' | 'left') {
    this.plane.position.x = this.x - scroll.current - this.extra;
    const x = this.plane.position.x;
    const halfWidth = this.viewport.width / 2;

    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const bendAbs = Math.abs(this.bend);
      const radius = (halfWidth * halfWidth + bendAbs * bendAbs) / (2 * bendAbs);
      const effectiveX = Math.min(Math.abs(x), halfWidth);
      const arc = radius - Math.sqrt(radius * radius - effectiveX * effectiveX);
      this.plane.position.y = this.bend > 0 ? -arc : arc;
      this.plane.rotation.z = (this.bend > 0 ? -1 : 1) * Math.sign(x) * Math.asin(effectiveX / radius);
    }

    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.025;
    this.program.uniforms.uSpeed.value = this.speed;

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
    if (direction === 'right' && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === 'left' && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  }

  onResize({ screen, viewport }: { screen?: ScreenSize; viewport?: Viewport } = {}) {
    if (screen) this.screen = screen;
    if (viewport) this.viewport = viewport;
    this.scale = this.screen.height / 1400;
    this.plane.scale.y = (this.viewport.height * (860 * this.scale)) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * (720 * this.scale)) / this.screen.width;
    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.padding = 1.55;
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

class App {
  container: HTMLElement;
  scrollSpeed: number;
  scroll: { ease: number; current: number; target: number; last: number; position?: number };
  onCheckDebounce: (...args: any[]) => void;
  renderer!: Renderer;
  gl!: GL;
  camera!: Camera;
  scene!: Transform;
  planeGeometry!: Plane;
  medias: Media[] = [];
  screen!: ScreenSize;
  viewport!: Viewport;
  raf = 0;
  isDown = false;
  start = 0;

  constructor(container: HTMLElement, { items, bend = 2, textColor = 'var(--color-story-pale)', borderRadius = 0.03, font = DEFAULT_FONT, scrollSpeed = 2, scrollEase = 0.05 }: CircularGalleryProps) {
    this.container = container;
    this.scrollSpeed = scrollSpeed;
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
    this.onCheckDebounce = debounce(this.onCheck.bind(this), 180);
    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias(items, bend, textColor, borderRadius, font);
    this.update();
    this.addEventListeners();
  }

  createRenderer() {
    this.renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.container.appendChild(this.renderer.gl.canvas as HTMLCanvasElement);
  }

  createCamera() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }

  createScene() {
    this.scene = new Transform();
  }

  createGeometry() {
    this.planeGeometry = new Plane(this.gl, { heightSegments: 32, widthSegments: 64 });
  }

  createMedias(items: GalleryItem[] | undefined, bend: number, textColor: string, borderRadius: number, font: string) {
    const defaultItems = [
      { image: '/home_sequence/Untitled_Artwork-1.png', text: 'Story frame' },
      { image: '/home_sequence/Untitled_Artwork-4.png', text: 'Service detail' },
      { image: '/home_sequence/Untitled_Artwork-8.png', text: 'A clean handover' },
    ];
    const galleryItems = items?.length ? items : defaultItems;
    const repeatedItems = galleryItems.concat(galleryItems);
    this.medias = repeatedItems.map((data, index) =>
      new Media({
        geometry: this.planeGeometry,
        gl: this.gl,
        image: data.image,
        index,
        length: repeatedItems.length,
        scene: this.scene,
        screen: this.screen,
        text: data.text,
        viewport: this.viewport,
        bend,
        textColor,
        borderRadius,
        font,
      })
    );
  }

  onResize = () => {
    this.screen = { width: this.container.clientWidth, height: this.container.clientHeight };
    if (!this.screen.width || !this.screen.height || !this.renderer) return;
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / this.screen.height });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };
    this.medias.forEach(media => media.onResize({ screen: this.screen, viewport: this.viewport }));
  };

  onWheel = (event: WheelEvent) => {
    this.scroll.target += (event.deltaY > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.22;
    this.onCheckDebounce();
  };

  onPointerDown = (event: PointerEvent) => {
    this.isDown = true;
    this.container.setPointerCapture?.(event.pointerId);
    this.scroll.position = this.scroll.current;
    this.start = event.clientX;
  };

  onPointerMove = (event: PointerEvent) => {
    if (!this.isDown) return;
    const distance = (this.start - event.clientX) * (this.scrollSpeed * 0.025);
    this.scroll.target = (this.scroll.position ?? 0) + distance;
  };

  onPointerUp = (event: PointerEvent) => {
    this.isDown = false;
    this.container.releasePointerCapture?.(event.pointerId);
    this.onCheck();
  };

  onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      this.scroll.target += (event.key === 'ArrowRight' ? 1 : -1) * this.scrollSpeed * 4;
      this.onCheckDebounce();
    }
  };

  onCheck() {
    if (!this.medias[0]) return;
    const width = this.medias[0].width;
    const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    const item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }

  update = () => {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? 'right' : 'left';
    this.medias.forEach(media => media.update(this.scroll, direction));
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = window.requestAnimationFrame(this.update);
  };

  addEventListeners() {
    window.addEventListener('resize', this.onResize);
    this.container.addEventListener('wheel', this.onWheel, { passive: true });
    this.container.addEventListener('pointerdown', this.onPointerDown);
    this.container.addEventListener('pointermove', this.onPointerMove);
    this.container.addEventListener('pointerup', this.onPointerUp);
    this.container.addEventListener('pointerleave', this.onPointerUp);
    this.container.addEventListener('keydown', this.onKeyDown);
  }

  destroy() {
    window.cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.container.removeEventListener('wheel', this.onWheel);
    this.container.removeEventListener('pointerdown', this.onPointerDown);
    this.container.removeEventListener('pointermove', this.onPointerMove);
    this.container.removeEventListener('pointerup', this.onPointerUp);
    this.container.removeEventListener('pointerleave', this.onPointerUp);
    this.container.removeEventListener('keydown', this.onKeyDown);
    this.renderer.gl.canvas.parentNode?.removeChild(this.renderer.gl.canvas as HTMLCanvasElement);
  }
}

export default function CircularGallery({
  items,
  bend = 2,
  textColor = 'var(--color-story-pale)',
  borderRadius = 0.025,
  font = DEFAULT_FONT,
  fontUrl,
  scrollSpeed = 2,
  scrollEase = 0.045,
}: CircularGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let app: App | undefined;
    let isMounted = true;

    loadFont(font, fontUrl).then(resolvedFont => {
      if (!isMounted || !containerRef.current) return;
      app = new App(containerRef.current, { items, bend, textColor, borderRadius, font: resolvedFont, scrollSpeed, scrollEase });
    });

    return () => {
      isMounted = false;
      app?.destroy();
    };
  }, [items, bend, textColor, borderRadius, font, fontUrl, scrollSpeed, scrollEase]);

  return (
    <div
      className="h-full w-full cursor-grab overflow-hidden border-y-2 border-story-pale/30 active:cursor-grabbing"
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Circular image gallery. Use left and right arrow keys, mouse wheel, or drag to navigate."
    />
  );
}