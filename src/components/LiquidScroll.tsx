import { useEffect, useRef } from "react";

/**
 * Liquid scroll effect.
 * - A fixed full-screen WebGL canvas renders an animated refractive ripple
 *   layer whose intensity is driven by scroll velocity.
 * - The page <main> gets a subtle vertical squash + skew based on the same
 *   velocity, producing a "liquidy" inertia feel.
 *
 * Disabled automatically for prefers-reduced-motion.
 */
export default function LiquidScroll() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false });
    if (!gl) return;

    const vert = `
      attribute vec2 a_pos;
      varying vec2 v_uv;
      void main() {
        v_uv = a_pos * 0.5 + 0.5;
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;

    const frag = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform float u_vel;       // scroll velocity (normalized)
      uniform vec2  u_res;

      // simple value noise
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.,0.));
        float c = hash(i + vec2(0.,1.));
        float d = hash(i + vec2(1.,1.));
        vec2 u = f*f*(3.-2.*f);
        return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
      }

      void main(){
        vec2 uv = v_uv;
        float aspect = u_res.x / u_res.y;
        vec2 p = vec2(uv.x * aspect, uv.y);

        float t = u_time * 0.25;
        float v = clamp(abs(u_vel), 0.0, 1.0);

        // moving caustic-like bands
        float n1 = noise(p * 3.0 + vec2(0.0, t + u_vel * 2.0));
        float n2 = noise(p * 6.0 - vec2(t * 0.7, u_vel * 3.0));
        float bands = sin((n1 + n2) * 6.2831 + t * 2.0);
        bands = smoothstep(0.55, 1.0, bands * 0.5 + 0.5);

        // horizontal sweeping wave triggered by velocity
        float wave = sin(uv.y * 40.0 - t * 6.0 - u_vel * 8.0) * 0.5 + 0.5;
        wave = pow(wave, 8.0);

        float a = (bands * 0.06 + wave * 0.10) * v;
        // very subtle cool tint
        vec3 col = vec3(0.78, 0.86, 1.0);
        gl_FragColor = vec4(col, a);
      }
    `;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uVel = gl.getUniformLocation(prog, "u_vel");
    const uRes = gl.getUniformLocation(prog, "u_res");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    // Track scroll velocity (smoothed)
    let lastY = window.scrollY;
    let lastT = performance.now();
    let rawVel = 0;
    let smoothVel = 0;

    const onScroll = () => {
      const now = performance.now();
      const dy = window.scrollY - lastY;
      const dt = Math.max(1, now - lastT);
      // px / ms, normalized
      rawVel = Math.max(-1, Math.min(1, (dy / dt) * 0.25));
      lastY = window.scrollY;
      lastT = now;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Apply liquidy CSS transform to main
    const main = document.querySelector("main") as HTMLElement | null;
    if (main) {
      main.style.willChange = "transform";
      main.style.transformOrigin = "center top";
    }

    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const now = performance.now();
      // decay raw velocity over time so it falls off when scrolling stops
      rawVel *= 0.92;
      smoothVel += (rawVel - smoothVel) * 0.18;

      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform1f(uVel, smoothVel);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // liquidy squish on the page — small & elastic
      if (main) {
        const v = smoothVel;
        const scaleY = 1 + v * 0.04;
        const scaleX = 1 - v * 0.02;
        const skew = v * 0.6; // deg
        main.style.transform = `scale(${scaleX}, ${scaleY}) skewY(${skew}deg)`;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      if (main) {
        main.style.transform = "";
        main.style.willChange = "";
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100]"
      style={{ mixBlendMode: "multiply" }}
    />
  );
}