/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type LogoBurstOverlayProps = {
  seed: number;
  duration?: number;
  count?: number;
};

const DEFAULT_PARTICLES = 220;
const BOUNCE_TIME = 3500;

const LogoBurstOverlay: React.FC<LogoBurstOverlayProps> = ({
  seed,
  duration = 3000,
  count = DEFAULT_PARTICLES,
}) => {
  const [visible, setVisible] = useState(false);
  const particleRefs = useRef<(HTMLImageElement | null)[]>([]);

  const particles = useMemo(() => {
    if (!seed) {
      return [];
    }
    const seededRandom = (index: number, salt: number) => {
      const raw = Math.sin(seed * 977 + index * 37.17 + salt * 131.03) * 10000;
      return raw - Math.floor(raw);
    };
    const range = (
      index: number,
      salt: number,
      min: number,
      max: number
    ) => min + seededRandom(index, salt) * (max - min);

    return Array.from({ length: count }, (_, index) => {
      const speed = range(index, 8, 160, 320);
      const angle = range(index, 9, 0, Math.PI * 2);
      return {
        id: `${seed}-${index}`,
        size: range(index, 7, 30, 54),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        settleNorm: range(index, 3, 0.05, 0.95),
        scale: range(index, 10, 0.85, 1.35),
      };
    });
  }, [seed, count]);

  useEffect(() => {
    if (!seed) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      setVisible(true);
    });
    const timer = setTimeout(
      () => setVisible(false),
      duration + 800
    );
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [seed, duration]);

  useEffect(() => {
    if (!visible || !particles.length) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    const padding = 50;
    const boundsX = Math.max(window.innerWidth / 2 - padding, 120);
    const boundsY = Math.max(window.innerHeight / 2 - padding, 120);
    const bounceDuration = Math.min(duration, BOUNCE_TIME);
    const totalDuration = duration + 600;

    const configs = particles.map((particle) => ({
      ...particle,
      x: 0,
      y: 0,
      settled: false,
      settleX:
        (particle.settleNorm - 0.5) * (boundsX * 1.8),
    }));

    let start: number | null = null;
    let last: number | null = null;
    let rafId: number;

    const animate = (timestamp: number) => {
      if (start === null) {
        start = timestamp;
        last = timestamp;
      }
      const delta = Math.min(timestamp - (last ?? timestamp), 32) / 1000;
      last = timestamp;
      const elapsed = timestamp - start;

      configs.forEach((config, index) => {
        const node = particleRefs.current[index];
        if (!node) {
          return;
        }

        if (elapsed <= bounceDuration) {
          config.x += config.vx * delta;
          config.y += config.vy * delta;

          if (config.x > boundsX) {
            config.x = boundsX;
            config.vx *= -1;
          } else if (config.x < -boundsX) {
            config.x = -boundsX;
            config.vx *= -1;
          }

          if (config.y > boundsY) {
            config.y = boundsY;
            config.vy *= -1;
          } else if (config.y < -boundsY) {
            config.y = -boundsY;
            config.vy *= -1;
          }

          node.style.transition = "none";
          node.style.opacity = "1";
          node.style.transform = `translate(calc(-50% + ${config.x}px), calc(-50% + ${config.y}px)) scale(${config.scale})`;
        } else if (!config.settled) {
          config.settled = true;
          node.style.transition = "transform 0.6s ease, opacity 0.6s ease";
          node.style.transform = `translate(calc(-50% + ${config.settleX}px), calc(-50% + ${boundsY}px)) scale(0.7)`;
          node.style.opacity = "0";
        }
      });

      if (elapsed < totalDuration) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [visible, particles, duration]);

  if (!visible || particles.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {particles.map((particle, index) => (
        <img
          key={particle.id}
          src="/logo.jpg"
          alt=""
          aria-hidden="true"
          className="absolute logo-particle"
          ref={(node) => {
            particleRefs.current[index] = node;
          }}
          style={
            {
              top: "50%",
              left: "50%",
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              transform: `translate(-50%, -50%) scale(${particle.scale})`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default LogoBurstOverlay;
