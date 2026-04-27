"use client";
import React from "react";

const videos = [
  { src: "/images/carousel/videos/demo13s.mp4", poster: "/images/carousel/images/demo13s-poster.avif" },
  { src: "/images/carousel/videos/demo2.mp4", poster: "/images/carousel/images/demo2-poster.avif" },
  { src: "/images/carousel/videos/demo3.mp4", poster: "/images/carousel/images/demo3-poster.avif" },
  { src: "/images/carousel/videos/demo4.mp4", poster: "/images/carousel/images/demo4-poster.avif" },
  { src: "/images/carousel/videos/demo5.mp4", poster: "/images/carousel/images/demo5-poster.avif" },
  { src: "/images/carousel/videos/demo6.mp4", poster: "/images/carousel/images/demo6-poster.avif" },
  { src: "/images/carousel/videos/demo7.mp4", poster: "/images/carousel/images/demo7-poster.avif" },
  { src: "/images/carousel/videos/demo8.mp4", poster: "/images/carousel/images/demo8-poster.avif" },
];

const images = [
  { src: "/images/carousel/images/build.avif", alt: "Architecture" },
  { src: "/images/carousel/images/crafter.avif", alt: "Crafter" },
  { src: "/images/carousel/images/daily.avif", alt: "Building" },
  { src: "/images/carousel/images/dash-dark.avif", alt: "Mountain" },
  { src: "/images/carousel/images/dash-light.avif", alt: "Nature" },
  { src: "/images/carousel/images/grok.avif", alt: "Landscape" },
  { src: "/images/carousel/images/lovable.avif", alt: "Lovable" },
  { src: "/images/carousel/images/mountain.avif", alt: "Trees" },
  { src: "/images/carousel/images/nature.avif", alt: "Woods" },
  { src: "/images/carousel/images/readline.avif", alt: "Readline" },
  { src: "/images/carousel/images/openvid.avif", alt: "Forest" },
  { src: "/images/carousel/images/kebo.avif", alt: "Vegetative" },
];

export function CarouselDemos() {
  return (
    <section className="w-full relative">
      <style>{`
        .scene-3d {
          width: 100%;
          height: 65vh; 
          min-height: 800px;
          display: grid;
          overflow: hidden;
          perspective: 70em;
          font-size: clamp(12px, 1.2vw, 25px); 
          mask: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%);
          -webkit-mask: linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%);
        }
        .a3d-container {
          grid-area: 1/1;
          place-self: center;
          transform-style: preserve-3d;
          animation: ry 40s linear infinite;
          display: grid;
        }
        @keyframes ry {
          to { transform: rotateY(1turn); }
        }
        .row-videos {
          translate: 0 -7.5em; 
        }
        .row-videos .card-3d {
          --w: 32em;
          aspect-ratio: 16/9;
        }
        .row-images {
          translate: 0 12em;
          animation-direction: reverse;
          animation-duration: 50s;
        }
        .row-images .card-3d {
          --w: 28em;
          aspect-ratio: 16/9;
        }
        .card-3d {
          --ba: calc(1turn / var(--n));
          grid-area: 1/1;
          width: var(--w);
          object-fit: cover;
          border-radius: 1rem;
          backface-visibility: hidden;
          box-shadow: 0 15px 40px -10px rgba(0, 0, 0, 0.9);
          transform: rotateY(calc(var(--i) * var(--ba))) 
                     translateZ(calc(-1 * (0.5 * var(--w) + 1.5em) / Math.tan(0.5 * var(--ba))));
          transform: rotateY(calc(var(--i) * var(--ba))) translateZ(calc(-1 * (0.5 * var(--w) + 1.5em) / tan(0.5 * var(--ba))));
        }
        @media (prefers-reduced-motion: reduce) {
          .a3d-container { animation-duration: 120s; }
        }
        @media (width <= 640px) {
          .scene-3d {
            height: 65vh; 
            min-height: 500px;
          }
        }
      `}</style>

      <div className="scene-3d relative">
        <div className="absolute bottom-20 sm:-bottom-4 sm:left-120 z-0 pointer-events-none opacity-50">
          <img
            src="/images/carousel/decorators/sparkle.png"
            className="size-20 md:size-48 animate-pulse"
          />
        </div>
        <div className="absolute bottom-10 sm:bottom-0 right-1/4 z-10 pointer-events-none">
          <img
            src="/images/carousel/decorators/sparkle-move.svg"
            className="size-8 md:size-10"
          />
        </div>
        <div className="a3d-container row-videos" style={{ "--n": videos.length } as React.CSSProperties}>
          {videos.map((vid, index) => (
            <video
              key={`video-${index}`}
              className="card-3d max-w-none bg-zinc-900 border border-white/10"
              style={{ "--i": index } as React.CSSProperties}
              autoPlay
              loop
              muted
              playsInline
              src={vid.src}
              poster={vid.poster}
            />
          ))}
        </div>

        <div className="a3d-container row-images" style={{ "--n": images.length } as React.CSSProperties}>
          {images.map((img, index) => (
            <img
              key={`img-${index}`}
              className="card-3d max-w-none bg-zinc-900 border border-white/10"
              style={{ "--i": index } as React.CSSProperties}
              src={img.src}
              alt={img.alt}
              loading="lazy"
            />
          ))}
        </div>
      </div>
    </section>
  );
}