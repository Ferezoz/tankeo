"use client";

import { useState, useEffect, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | null;

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [standalone, setStandalone] = useState(false);
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari-specific flag — not covered by the display-mode media query there.
      (navigator as { standalone?: boolean }).standalone === true;
    setStandalone(isStandalone);

    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) setPlatform("ios");
    else if (/Android/.test(ua)) setPlatform("android");
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Nothing to offer: already installed, or a platform where "install" isn't a
  // meaningful action (desktop browsers without a captured native prompt).
  if (standalone || (!platform && !deferredPrompt)) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setOpen((o) => !o);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleClick}
        title="Instalar app"
        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
      >
        ⬇️ Instalar app
      </button>
      {open && !deferredPrompt && (
        <div className="absolute right-0 top-full mt-2 z-[2000] w-64 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl p-4">
          {platform === "ios" ? (
            <ol className="text-xs text-gray-600 dark:text-gray-300 list-decimal list-inside space-y-1.5">
              <li>Toca el botón Compartir <span className="font-mono">⬆️</span> de tu navegador</li>
              <li>Elige <span className="font-medium">&quot;Agregar a inicio&quot;</span></li>
              <li>Toca <span className="font-medium">&quot;Agregar&quot;</span></li>
            </ol>
          ) : (
            <ol className="text-xs text-gray-600 dark:text-gray-300 list-decimal list-inside space-y-1.5">
              <li>Abre el menú <span className="font-mono">⋮</span> del navegador</li>
              <li>Elige <span className="font-medium">&quot;Instalar app&quot;</span> o <span className="font-medium">&quot;Agregar a pantalla de inicio&quot;</span></li>
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
