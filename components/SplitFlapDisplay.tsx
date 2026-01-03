"use client";

import React, { useState, useEffect, useCallback } from "react";

type SplitFlapDisplayProps = {
  text: string;
  highlighted?: boolean;
  maxLength?: number;
  className?: string;
};

const SplitFlapDisplay: React.FC<SplitFlapDisplayProps> = ({
  text,
  highlighted = false,
  maxLength = 30,
  className = "",
}) => {
  const [displayedText, setDisplayedText] = useState(text);
  const [flippingIndices, setFlippingIndices] = useState<Set<number>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);

  const paddedText = text.padEnd(maxLength, " ");
  const paddedDisplayed = displayedText.padEnd(maxLength, " ");

  const animateTransition = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    const chars = paddedText.split("");
    const currentChars = paddedDisplayed.split("");

    // Find which characters need to change
    const changedIndices: number[] = [];
    chars.forEach((char, i) => {
      if (char !== currentChars[i]) {
        changedIndices.push(i);
      }
    });

    if (changedIndices.length === 0) {
      setIsAnimating(false);
      return;
    }

    // Stagger the flip animation for each character
    changedIndices.forEach((charIndex, i) => {
      setTimeout(() => {
        setFlippingIndices((prev) => new Set([...prev, charIndex]));

        // Update the character after half the flip animation
        setTimeout(() => {
          setDisplayedText((prev) => {
            const arr = prev.padEnd(maxLength, " ").split("");
            arr[charIndex] = chars[charIndex];
            return arr.join("");
          });
        }, 75); // Half of 150ms animation

        // Remove from flipping set after animation completes
        setTimeout(() => {
          setFlippingIndices((prev) => {
            const next = new Set(prev);
            next.delete(charIndex);
            return next;
          });

          // Check if this was the last character
          if (i === changedIndices.length - 1) {
            setIsAnimating(false);
          }
        }, 150);
      }, i * 40); // 40ms stagger between each character
    });
  }, [paddedText, paddedDisplayed, isAnimating, maxLength]);

  useEffect(() => {
    if (text !== displayedText.trim()) {
      animateTransition();
    }
  }, [text, displayedText, animateTransition]);

  // Trim trailing spaces for display but keep cells for visual consistency
  const trimmedLength = text.length;

  return (
    <div
      className={`flex flex-wrap justify-center items-center ${className}`}
      role="marquee"
      aria-label={text}
    >
      {paddedDisplayed.split("").map((char, index) => {
        // Only show cells up to a reasonable display width
        if (index >= Math.max(trimmedLength, 1)) return null;

        const isSpace = char === " ";
        const isFlipping = flippingIndices.has(index);

        return (
          <span
            key={index}
            className={`split-flap-char ${isFlipping ? "flipping" : ""} ${isSpace ? "space" : ""}`}
            style={{
              color: highlighted ? "#cb6b1e" : "#f6e1bd",
              fontSize: "1.1rem",
            }}
          >
            {isSpace ? "\u00A0" : char.toUpperCase()}
          </span>
        );
      })}
    </div>
  );
};

export default SplitFlapDisplay;
