"use client";
import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
const bentoVideos = [
  {
    id: 1,
    src: "https://domare.hernandack.com/uploads/19bf07ca35f55af46ea6396865198c5c.mp4",
    className: "",
  },
  {
    id: 2,
    src: "https://www.w3schools.com/html/mov_bbb.mp4",
    className: "min-[690px]:col-[2/3] min-[690px]:row-span-2",
  },
  {
    id: 3,
    src: "https://domare.hernandack.com/uploads/19bf07ca35f55af46ea6396865198c5c.mp4",
    className:
      "min-[690px]:col-span-2 max-[690px]:col-[2/4] max-[690px]:row-[1/2] max-[470px]:col-auto max-[470px]:row-auto",
  },
  {
    id: 4,
    src: "https://www.w3schools.com/html/mov_bbb.mp4",
    className: "",
  },
  {
    id: 5,
    src: "/images/pages/demo.mp4",
    className: "min-[690px]:col-[3/5] min-[690px]:row-[2/3] max-[470px]:col-span-2",
  },
];


export function BentoDemos() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bento-card",
        {
          y: 80,
          opacity: 0,
          scale: 0.85,
          rotateX: -15,
          filter: "blur(12px)",
          transformOrigin: "center bottom",
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          rotateX: 0,
          filter: "blur(0px)",
          duration: 1.4,
          stagger: {
            amount: 0.5,
            from: "start",
          },
          ease: "expo.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
            toggleActions: "play none none none", 
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="grid place-content-center gap-[15px] p-[max(2vh,1.5rem)] w-full h-[80vh] min-h-[460px] grid-cols-[25%_30%_15%_25%] grid-rows-2 max-[690px]:h-[65vh] max-[470px]:grid-cols-2 max-[470px]:grid-rows-3 perspective-[1200px]"
    >
      {bentoVideos.map((item) => (
        <div
          key={item.id}
          className={`bento-card group relative rounded-[25px] overflow-hidden bg-zinc-900 border border-white/10 shadow-lg transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:border-white/30 z-0 hover:z-10 ${item.className}`}
        >
          <div className="absolute inset-0 bg-black/20 z-10 transition-opacity duration-700 group-hover:opacity-0 pointer-events-none" />
          
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          >
            <source src={item.src} type="video/mp4" />
            Tu navegador no soporta el tag de video.
          </video>
        </div>
      ))}
    </section>
  );
}