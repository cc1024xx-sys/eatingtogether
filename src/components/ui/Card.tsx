"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border-2 border-[#E8DFD4] p-4 shadow-sm ${onClick ? "cursor-pointer hover:border-[#F7D070] transition-colors" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
