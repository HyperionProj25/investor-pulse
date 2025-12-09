"use client";

import React from "react";

type BaselineLogoProps = {
  size?: string;
};

const BaselineLogo: React.FC<BaselineLogoProps> = ({ size = "w-24 h-24" }) => {
  const animationStyles = `
    .lineAnimation {
      animation: waveUp 1s ease-in-out infinite;
    }
    @keyframes waveUp {
      0%, 100% {
        transform: scaleY(0.2);
      }
      50% {
        transform: scaleY(1);
      }
    }
  `;

  return (
    <>
      <style>{animationStyles}</style>
      <div className={`${size} mx-auto relative`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Pentagon frame */}
          <path
            d="M20,20 L80,20 L80,50 L50,70 L20,50 Z"
            fill="none"
            stroke="#f6e1bd"
            strokeWidth="2"
          />

          {/* Top line - split into two segments with gap for BASELINE text */}
          {/* Left segment - from left corner to before B */}
          <line x1="20" y1="20" x2="28" y2="20" stroke="#f6e1bd" strokeWidth="2" />

          {/* Right segment - from after E to right corner */}
          <line x1="72" y1="20" x2="80" y2="20" stroke="#f6e1bd" strokeWidth="2" />

          {/* BASELINE text - centered in the gap */}
          <text
            x="50"
            y="20"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fontWeight="bold"
            fill="#f6e1bd"
          >
            BASELINE
          </text>

          {/* Corner nodes */}
          <circle cx="20" cy="20" r="3" fill="#f6e1bd" />
          <circle cx="80" cy="20" r="3" fill="#f6e1bd" />
          <circle cx="20" cy="50" r="3" fill="#f6e1bd" />
          <circle cx="80" cy="50" r="3" fill="#f6e1bd" />
          <circle cx="50" cy="70" r="3" fill="#f6e1bd" />

          {/* Animated orange "baseline" bars */}
          {[{ x: 30, y: 51 }, { x: 40, y: 57 }, { x: 50, y: 61 }, { x: 60, y: 57 }, { x: 70, y: 51 }].map(
            (pos, i) => (
              <g key={i}>
                <line
                  x1={pos.x}
                  y1={pos.y - 25}
                  x2={pos.x}
                  y2={pos.y}
                  stroke="#cb6b1e"
                  strokeWidth="2"
                  className="lineAnimation"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    transformOrigin: `${pos.x}px ${pos.y}px`,
                  }}
                />
                <circle cx={pos.x} cy={pos.y} r="2.5" fill="#cb6b1e" />
              </g>
            )
          )}
        </svg>
      </div>
    </>
  );
};

export default BaselineLogo;
