"use client";

import { useState } from "react";
import { Navigation, type Tab } from "@/components/Navigation";
import { FridgeModule } from "@/components/fridge/FridgeModule";
import { KitchenModule } from "@/components/kitchen/KitchenModule";
import { TogetherModule } from "@/components/together/TogetherModule";

import { useDailyExpiryPush } from "@/lib/useDailyExpiryPush";

import { useUnreadMessageCount } from "@/lib/hooks";

export default function Home() {
  const [tab, setTab] = useState<Tab>("fridge");
  const unreadMessages = useUnreadMessageCount(tab);
  useDailyExpiryPush();

  return (
    <div className="min-h-screen bg-[#FBF8F3]">
      <Navigation
        active={tab}
        onChange={setTab}
        unreadMessages={unreadMessages}
      />
      <main className="max-w-2xl mx-auto px-4 py-4 pb-8">
        {tab === "fridge" && <FridgeModule />}
        {tab === "kitchen" && <KitchenModule />}
        {tab === "together" && <TogetherModule />}
      </main>
    </div>
  );
}
