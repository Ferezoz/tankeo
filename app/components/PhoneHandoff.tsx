"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";

interface PhoneHandoffProps {
  lat: number;
  lng: number;
  stationId: string | null;
}

export default function PhoneHandoff({ lat, lng, stationId }: PhoneHandoffProps) {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const url = new URL(window.location.origin);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lng", String(lng));
    if (stationId) url.searchParams.set("station", stationId);

    QRCode.toDataURL(url.toString(), { width: 180, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [open, lat, lng, stationId]);

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

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Enviar a tu celular"
        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
      >
        📱 Enviar a tu celular
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-[2000] w-56 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Escanea para abrir {stationId ? "esta gasolinera" : "esta zona"} en tu celular
          </p>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="Código QR" width={180} height={180} className="mx-auto rounded-lg" />
          ) : (
            <div className="w-[180px] h-[180px] mx-auto flex items-center justify-center text-gray-400 text-xs">
              Generando...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
