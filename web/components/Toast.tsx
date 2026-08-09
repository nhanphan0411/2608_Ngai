"use client";

import { useEffect, useState } from "react";

type ToastItem = {
  id: number;
  message: string;
};

export default function Toast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handleShowToast(e: Event) {
      const message = (e as CustomEvent<string>).detail;
      const id = Date.now();

      setToasts((prev) => [...prev, { id, message }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2500);
    }

    window.addEventListener("show-toast", handleShowToast);
    return () => window.removeEventListener("show-toast", handleShowToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-black text-white text-sm px-4 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}