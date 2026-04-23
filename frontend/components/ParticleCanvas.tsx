"use client";

import { useEffect, useRef } from "react";

function getColors(isDark: boolean) {
  return isDark
    ? {
        amber: "rgba(201,168,76,0.55)",
        regular: "rgba(232,224,204,0.35)",
        line: (a: number) => `rgba(201,168,76,${a})`,
      }
    : {
        amber: "rgba(184,134,11,0.45)",
        regular: "rgba(30,50,100,0.25)",
        line: (a: number) => `rgba(30,50,100,${(a * 5 / 3).toFixed(3)})`,
      };
}

const N_DARK = 55;
const N_LIGHT = Math.round(N_DARK * 1.5); // 83

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDarkRef = useRef(true);

  useEffect(() => {
    isDarkRef.current = document.documentElement.getAttribute("data-theme") !== "light";

    const observer = new MutationObserver(() => {
      isDarkRef.current = document.documentElement.getAttribute("data-theme") !== "light";
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: N_LIGHT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.4 + 0.5,
      amber: Math.random() < 0.35,
    }));
    const draw = () => {
      const isDark = isDarkRef.current;
      const colors = getColors(isDark);
      const n = isDark ? N_DARK : N_LIGHT;
      const rScale = isDark ? 1 : 1.3;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < n; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * rScale, 0, Math.PI * 2);
        ctx.fillStyle = p.amber ? colors.amber : colors.regular;
        ctx.fill();
        for (let j = i + 1; j < n; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = colors.line(0.09 * (1 - dist / 130));
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      observer.disconnect();
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
