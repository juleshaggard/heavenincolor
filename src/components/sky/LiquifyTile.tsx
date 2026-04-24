import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle, Texture } from "ogl";
import { cldUrl, type SkyImage } from "@/lib/cloudinary";
import { ensureScrollVelocity, getScrollVelocity } from "@/hooks/useScrollVelocity";

const VERT = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform float uVel;
uniform float uHasTex;

// cheap pseudo-noise
float n(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  // vertical wobble that intensifies with scroll velocity
  float v = uVel;
  float wave = sin(uv.y * 8.0 + uTime * 2.0) * 0.012 * v;
  float swirl = sin(uv.x * 6.0 + uTime * 1.3) * 0.010 * v;
  uv.x += wave;
  uv.y += swirl;
  // slight stretch in scroll direction
  uv.y = mix(uv.y, uv.y + (uv.y - 0.5) * 0.15 * v, 1.0);
  uv = clamp(uv, 0.001, 0.999);
  vec4 col = uHasTex > 0.5 ? texture2D(uTex, uv) : vec4(0.08, 0.08, 0.1, 1.0);
  gl_FragColor = col;
}
`;

type Props = {
  image: SkyImage;
  width?: number;
  className?: string;
};

export function LiquifyTile({ image, width = 400, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    ensureScrollVelocity();
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let raf = 0;

    const renderer = new Renderer({
      canvas,
      dpr: Math.min(2, window.devicePixelRatio || 1),
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const texture = new Texture(gl, { generateMipmaps: false });
    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTex: { value: texture },
        uTime: { value: 0 },
        uVel: { value: 0 },
        uHasTex: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // load image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (disposed) return;
      texture.image = img;
      program.uniforms.uHasTex.value = 1;
    };
    img.src = cldUrl(image.public_id, { w: width });

    const start = performance.now();
    const loop = () => {
      if (disposed) return;
      const t = (performance.now() - start) / 1000;
      program.uniforms.uTime.value = t;
      program.uniforms.uVel.value = getScrollVelocity();
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      // free GL resources
      const ext = gl.getExtension("WEBGL_lose_context");
      ext?.loseContext();
    };
  }, [image.public_id, width]);

  return <canvas ref={canvasRef} className={className} />;
}