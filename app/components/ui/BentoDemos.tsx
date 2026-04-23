"use client";

import React, { useEffect, useRef, useState } from "react";

const bentoItems = [
  { id: 1, src: "/images/pages/lovable.avif", className: "" },
  { id: 2, src: "/images/pages/vegetative.avif", className: "min-[690px]:col-[2/3] min-[690px]:row-span-2" },
  { id: 3, src: "/images/pages/demo2.mp4", className: "min-[690px]:col-span-2 max-[690px]:col-[2/4] max-[690px]:row-[1/2] max-[470px]:col-auto max-[470px]:row-auto" },
  { id: 4, src: "/images/pages/crafter.avif", className: "" },
  { id: 5, src: "/images/pages/demo.mp4", className: "min-[690px]:col-[3/5] min-[690px]:row-[2/3] max-[470px]:col-span-2" },
];

export function BentoDemos() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 } 
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const isVideo = (src: string) => src.endsWith(".mp4") || src.endsWith(".webm");

  return (
    <section
      ref={containerRef}
      className="grid place-content-center gap-4 p-[max(2vh,1.5rem)] w-full h-[80vh] min-h-115 grid-cols-[25%_30%_15%_25%] grid-rows-2 max-[690px]:h-[65vh] max-[470px]:grid-cols-2 max-[470px]:grid-rows-3 perspective-distant"
    >
      {bentoItems.map((item, index) => (
        <div
          key={item.id}
          className={`bento-card group relative rounded-[25px] overflow-hidden bg-zinc-900 border border-white/10 shadow-lg transition-all duration-700 ease-out hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:border-white/30 z-0 hover:z-10 ${item.className}
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
          style={{ 
            transitionDelay: isVisible ? `${index * 150}ms` : "0ms" 
          }}
        >
          <div className="absolute inset-0 bg-black/20 z-10 transition-opacity duration-700 group-hover:opacity-0 pointer-events-none" />
          
          {isVideo(item.src) ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            >
              <source src={item.src} type="video/mp4" />
            </video>
          ) : (
            <img
              src={item.src}
              alt={`Bento item ${item.id}`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          )}
        </div>
      ))}
    </section>
  );
}