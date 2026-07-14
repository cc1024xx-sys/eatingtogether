"use client";

import { ReactNode } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#F7D070] text-[#4A3E3D] hover:bg-[#F0C45A] shadow-sm",
    secondary:
      "bg-white text-[#4A3E3D] border-2 border-[#E8DFD4] hover:border-[#F7D070]",
    ghost: "bg-transparent text-[#4A3E3D] hover:bg-[#F7D070]/20",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
