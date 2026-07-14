"use client";

import { Refrigerator, ChefHat, Heart, Sparkles } from "lucide-react";

export type Tab = "fridge" | "kitchen" | "together";

interface NavigationProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: typeof Refrigerator }[] = [
  { id: "fridge", label: "电子冰箱", icon: Refrigerator },
  { id: "kitchen", label: "今日菜单", icon: ChefHat },
  { id: "together", label: "留言板", icon: Heart },
];

export function Navigation({ active, onChange }: NavigationProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#FBF8F3]/90 backdrop-blur-md border-b-2 border-[#E8DFD4]">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-[#F7D070] flex items-center justify-center">
            <Sparkles size={22} className="text-[#4A3E3D]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#4A3E3D]">小食光</h1>
            <p className="text-xs text-[#4A3E3D]/60">FlavorTogether · 双人食材与菜谱</p>
          </div>
        </div>
        <nav className="flex gap-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                active === id
                  ? "bg-[#F7D070] text-[#4A3E3D] shadow-sm"
                  : "bg-white text-[#4A3E3D]/70 border border-[#E8DFD4] hover:border-[#F7D070]"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
