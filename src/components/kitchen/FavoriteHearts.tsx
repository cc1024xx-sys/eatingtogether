"use client";

import { Heart } from "lucide-react";

interface FavoriteHeartsProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
}

export function FavoriteHearts({
  value,
  onChange,
  size = "md",
}: FavoriteHeartsProps) {
  const iconSize = size === "sm" ? 14 : 18;
  const clamped = Math.min(5, Math.max(1, value || 3));

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((level) => {
        const filled = level <= clamped;
        return (
          <button
            key={level}
            type="button"
            disabled={!onChange}
            onClick={() => onChange?.(level)}
            className={`transition-colors ${
              onChange
                ? "hover:scale-110 active:scale-95"
                : "cursor-default"
            }`}
            title={onChange ? `${level} 颗爱心` : undefined}
          >
            <Heart
              size={iconSize}
              className={
                filled
                  ? "fill-[#E98B75] text-[#E98B75]"
                  : "text-[#E8DFD4]"
              }
            />
          </button>
        );
      })}
    </div>
  );
}
