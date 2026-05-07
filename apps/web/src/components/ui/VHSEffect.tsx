'use client';
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

/* ── Public API for feeding the ghost canvas ── */

export interface VHSHandle {
  /** Call every frame with the ghost canvas that has the screen + ghost composited */
  updateScene(canvas: HTMLCanvasElement): void;
}

function generateNoiseCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i]     = Math.random() * 255;
    img.data[i + 1] = Math.random() * 255;
    img.data[i + 2] = Math.random() * 255;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const SHADER = `
  uniform sampler2D noise;
  uniform sampler2D scene;
  uniform vec2 scene_resolution;

  float ramp(float y, float start, float end) {
    float inside = step(start, y) - step(end, y);
    float fact = (y - start) / (end - start) * inside;
    return (1.0 - fact) * inside;
  }

  float onOff(float a, float b, float c, float t) {
    return step(c, sin(t + a * cos(t * b)));
  }

  vec2 screenDistort(vec2 uv) {
    uv -= vec2(0.5, 0.5);
    uv = uv * 1.2 * (1.0 / 1.2 + 2.0 * uv.x * uv.x * uv.y * uv.y);
    uv += vec2(0.5, 0.5);
    return uv;
  }

  vec2 scanWarp(vec2 uv, float t) {
    float window = 1.0 / (1.0 + 20.0 * (uv.y - mod(t / 4.0, 1.0)) * (uv.y - mod(t / 4.0, 1.0)));
    uv.x = uv.x + sin(uv.y * 10.0 + t) / 50.0 * onOff(4.0, 4.0, 0.3, t) * (1.0 + cos(t * 80.0)) * window;
    float vShift = 0.4 * onOff(2.0, 3.0, 0.9, t) * (sin(t) * sin(t * 20.0) + (0.5 + 0.1 * sin(t * 200.0) * cos(t)));
    uv.y = mod(uv.y + vShift, 1.0);
    return uv;
  }

  float vignette(vec2 uv, float t) {
    float vigAmt = 3.0 + 0.3 * sin(t + 5.0 * cos(t * 5.0));
    return (1.0 - vigAmt * (uv.y - 0.5) * (uv.y - 0.5)) * (1.0 - vigAmt * (uv.x - 0.5) * (uv.x - 0.5));
  }

  float crtLines(vec2 uv, float t) {
    return ((12.0 + mod(uv.y * 30.0 + t, 1.0)) / 13.0);
  }

  float getNoise(vec2 p, float t) {
    float s = texture2D(noise, vec2(1.0, 2.0 * cos(t)) * t * 8.0 + p * 1.0).x;
    s *= s;
    return s;
  }

  float getStripes(vec2 uv, float t) {
    float noi = getNoise(uv * vec2(0.5, 1.0) + vec2(1.0, 3.0), t);
    return ramp(mod(uv.y * 4.0 + t/2.0 + sin(t + sin(t * 0.63)), 1.0), 0.5, 0.6) * noi;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv = screenDistort(uv);
    uv = scanWarp(uv, u_time);

    // Sample the scene (screen + ghost composited)
    vec4 sceneColor = texture2D(scene, uv);

    vec3 col = sceneColor.rgb;

    // VHS effects on top of scene content
    col += getStripes(uv, u_time) * 0.3;
    col += getNoise(uv * 3.0, u_time) * 0.08;
    col *= vignette(uv, u_time);
    col *= crtLines(uv, u_time);

    gl_FragColor = vec4(col, sceneColor.a);
  }
`;

export const VHSEffect = forwardRef<VHSHandle, { className?: string; style?: React.CSSProperties }>(
  function VHSEffect({ className, style }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const initialized = useRef(false);

    // Expose updateScene to parent
    useImperativeHandle(ref, () => ({
      updateScene(canvas: HTMLCanvasElement) {
        if (!sceneCanvasRef.current) return;
        const ctx = sceneCanvasRef.current.getContext('2d');
        if (!ctx) return;
        // Resize if needed
        if (sceneCanvasRef.current.width !== canvas.width || sceneCanvasRef.current.height !== canvas.height) {
          sceneCanvasRef.current.width = canvas.width;
          sceneCanvasRef.current.height = canvas.height;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(canvas, 0, 0);
      },
    }));

    useEffect(() => {
      if (initialized.current || !containerRef.current) return;
      initialized.current = true;

      const container = containerRef.current;

      // Create hidden canvases
      const noiseCanvas = generateNoiseCanvas();
      const noiseId = 'vhs-noise-' + Math.random().toString(36).slice(2, 8);
      noiseCanvas.id = noiseId;
      noiseCanvas.style.display = 'none';
      document.body.appendChild(noiseCanvas);

      const sceneCanvas = document.createElement('canvas');
      const sceneId = 'vhs-scene-' + Math.random().toString(36).slice(2, 8);
      sceneCanvas.id = sceneId;
      sceneCanvas.width = 800;
      sceneCanvas.height = 450;
      sceneCanvas.style.display = 'none';
      document.body.appendChild(sceneCanvas);
      sceneCanvasRef.current = sceneCanvas;

      import('shader-doodle').then(() => {
        const sd = document.createElement('shader-doodle');
        sd.style.display = 'block';
        sd.style.width = '100%';
        sd.style.height = '100%';

        // Noise texture
        const noiseTex = document.createElement('sd-texture');
        noiseTex.setAttribute('src', '#' + noiseId);
        noiseTex.setAttribute('name', 'noise');
        sd.appendChild(noiseTex);

        // Scene texture (screen + ghost composited)
        const sceneTex = document.createElement('sd-texture');
        sceneTex.setAttribute('src', '#' + sceneId);
        sceneTex.setAttribute('name', 'scene');
        sceneTex.setAttribute('force-update', '');
        sd.appendChild(sceneTex);

        // Shader
        const script = document.createElement('script');
        script.type = 'x-shader/x-fragment';
        script.textContent = SHADER;
        sd.appendChild(script);

        container.appendChild(sd);
      });

      return () => {
        document.getElementById(noiseId)?.remove();
        document.getElementById(sceneId)?.remove();
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          display: 'block',
          width:   '100%',
          height:  '100%',
          ...style,
        }}
      />
    );
  }
);
