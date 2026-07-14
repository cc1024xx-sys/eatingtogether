"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, Send, Wifi } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { parseJsonResponse } from "@/lib/api";
import { useLocalStorage, useSync } from "@/lib/hooks";
import { CUTE_EMOJIS, type Message } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function TogetherModule() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("💕");
  const [authorName, setAuthorName] = useLocalStorage("flavor-author", "我");
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/messages");
      setMessages(await parseJsonResponse<Message[]>(res, []));
    } catch (error) {
      console.error("加载留言失败", error);
    } finally {
      setTimeout(() => setSyncing(false), 300);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSync(load, 2000);

  const handleSend = async () => {
    if (!content.trim()) return;
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        emoji: selectedEmoji,
        authorName,
      }),
    });
    setContent("");
    load();
  };

  return (
    <div className="space-y-4">
      <Card className="bg-[#F7D070]/10 border-[#F7D070]/30">
        <div className="flex items-center gap-2">
          <Wifi
            size={18}
            className={`text-[#4A3E3D] ${syncing ? "animate-pulse" : ""}`}
          />
          <div>
            <p className="font-medium text-sm">实时数据同步</p>
            <p className="text-xs text-[#4A3E3D]/60">
              两人操作秒级同步，打开两个浏览器窗口即可体验
            </p>
          </div>
        </div>
      </Card>

      <div>
        <label className="text-sm text-[#4A3E3D]/60">你的名字</label>
        <input
          className="w-full mt-1 px-4 py-2.5 rounded-2xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="老公 / 老婆 / 昵称"
        />
      </div>

      <div>
        <h2 className="font-semibold flex items-center gap-1.5 mb-3">
          <Heart size={18} className="text-[#E98B75]" /> 留言板
        </h2>

        <Card className="mb-3">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {CUTE_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setSelectedEmoji(emoji)}
                className={`text-xl p-1.5 rounded-xl transition-all ${
                  selectedEmoji === emoji
                    ? "bg-[#F7D070]/30 scale-110"
                    : "hover:bg-[#E8DFD4]/50"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <textarea
            className="w-full px-4 py-3 rounded-2xl border-2 border-[#E8DFD4] bg-white focus:border-[#F7D070] outline-none min-h-20 resize-none"
            placeholder="给对方留言吧～ 比如：今晚我想吃你做的可乐鸡翅！"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <Button onClick={handleSend} className="w-full mt-2">
            <Send size={16} className="mr-1" /> 发送留言
          </Button>
        </Card>

        <div className="space-y-2">
          {messages.length === 0 ? (
            <Card className="text-center py-6 text-[#4A3E3D]/50">
              <p>还没有留言</p>
              <p className="text-sm mt-1">写下第一条留言吧</p>
            </Card>
          ) : (
            messages.map((msg) => (
              <Card
                key={msg.id}
                className={
                  msg.authorName === authorName
                    ? "border-[#F7D070]/50 bg-[#F7D070]/5"
                    : ""
                }
              >
                <div className="flex items-start gap-2">
                  {msg.emoji && <span className="text-2xl">{msg.emoji}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{msg.authorName}</span>
                      <span className="text-xs text-[#4A3E3D]/40">
                        {formatDateTime(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-[#4A3E3D]/80 mt-1 whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
