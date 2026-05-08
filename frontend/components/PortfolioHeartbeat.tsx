"use client";
import { useEffect, useRef } from "react";

interface Props {
  volatility: number; // portfolio_volatility 0–1
  portfolioReturn: number; // portfolio_return, used for color
}

export default function PortfolioHeartbeat({ volatility, portfolioReturn }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Color: green if positive return, red if negative
    const isPos = portfolioReturn >= 0;
    const lineColor = isPos ? "#5cb88a" : "#e05c5c";

    // Amplitude based on volatility (min 4px, max 18px)
    const amp = 4 + Math.min(volatility * 120, 14);

    // Generate EKG waveform points for one cycle
    function ekg(x: number): number {
      const cycle = x % 120;
      if (cycle < 40) return Math.sin(cycle / 40 * Math.PI) * amp * 0.15;
      if (cycle < 50) return Math.sin((cycle - 40) / 10 * Math.PI) * amp * 0.4;
      if (cycle < 52) return -amp * 1.6;
      if (cycle < 54) return amp * 2.2;
      if (cycle < 58) return -amp * 0.5;
      if (cycle < 68) return Math.sin((cycle - 58) / 10 * Math.PI) * amp * 0.3;
      return Math.sin(cycle / 120 * Math.PI * 2) * amp * 0.08;
    }

    const speed = 1.2 + Math.min(volatility * 3, 2);

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Fade trail
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.3, lineColor);
      grad.addColorStop(1, lineColor);

      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const mid = H / 2;
      for (let px = 0; px <= W; px += 1) {
        const y = mid + ekg(px + offsetRef.current);
        if (px === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();

      // Glowing dot at leading edge
      const tipY = mid + ekg(W + offsetRef.current);
      ctx.beginPath();
      ctx.arc(W - 2, tipY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.shadowBlur = 12;
      ctx.fill();

      offsetRef.current += speed;
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [volatility, portfolioReturn]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        height: 36,
        pointerEvents: "none",
        zIndex: 50,
        opacity: 0.55,
      }}
    />
  );
}
