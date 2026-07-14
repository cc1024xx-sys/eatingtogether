"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
}

export function CookingAnimation({ active, onDone }: { active: boolean; onDone: () => void }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) return;

    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 200 - 100,
      y: Math.random() * 100,
      tx: Math.random() * 60 - 30,
      ty: -120 - Math.random() * 40,
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
      onDone();
    }, 900);

    return () => clearTimeout(timer);
  }, [active, onDone]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      <div className="relative">
        <div className="text-6xl animate-gentle-bounce">🍳</div>
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute w-3 h-3 rounded-full bg-[#F7D070] animate-fly-to-pot"
            style={
              {
                left: `${p.x}px`,
                top: `${p.y}px`,
                "--tx": `${p.tx}px`,
                "--ty": `${p.ty}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
