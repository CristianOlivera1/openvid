"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Icon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";

gsap.registerPlugin(ScrollTrigger);

const floatImages = [
  { src: "/images/scroll/magic.avif", pos: "top-[5%] left-[2%] md:left-[10%]", size: "w-[24vw] min-w-[180px]" },
  { src: "/images/scroll/sould.avif", pos: "top-[40%] left-[2%] md:left-[4%]", size: "w-[15vw] min-w-[120px]" },
  { src: "/images/scroll/hapyrobot.avif", pos: "bottom-[10%] sm:bottom-[1%] sm:left-[2%] md:left-[20%]", size: "w-[15vw] min-w-[120px]" },
  { src: "/images/scroll/shadcn.avif", pos: "top-[20%] left-1/2 -translate-x-1/2 sm:top-[1%] sm:left-1/2 sm:-translate-x-1/2", size: "w-[24vw] min-w-[180px]" },
  {
    src: "/images/scroll/godly.avif", pos: "bottom-[30%] left-1/2 -translate-x-1/2 sm:bottom-[5%] sm:left-[40%] sm:-translate-x-1/2",
    size: "w-[35vw] min-w-[150px] sm:w-[22vw] shadow-[0_0_100px_rgba(0,156,242,0.1)]"
  },
  { src: "/images/scroll/powered.avif", pos: "top-[5%] right-[2%] md:right-[5%]", size: "w-[15vw] min-w-[120px]" },
  { src: "/images/scroll/vscode.avif", pos: "top-[40%] right-[2%] md:right-[2%]", size: "w-[24vw] min-w-[180px]" },
  { src: "/images/scroll/daily.avif", pos: "bottom-[15%] sm:bottom-[8%] right-[2%] md:right-[15%]", size: "w-[19vw] min-w-[150px]" },
  { src: "/images/scroll/lumina.avif", pos: "top-[18%] left-[10%] -translate-x-1/2 -translate-y-1/2 sm:top-[15%] sm:left-[30%] sm:-translate-x-[0vw] sm:translate-y-0 md:-translate-x-[0vw]", size: "w-[30vw] min-w-[120px] sm:w-[12vw]" },
  { src: "/images/scroll/onyx.avif", pos: "top-[15%] left-1/2 -translate-x-1/2 sm:left-[60%] sm:translate-x-[20vw] md:translate-x-[15vw]", size: "w-[25vw] min-w-[100px] sm:w-[13vw]" },
];

export function HeroScrollMask() {
  const t = useTranslations('demo');
  const pinContainerRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const textContainerRef = useRef<HTMLDivElement>(null);

  const [featureIndex, setFeatureIndex] = useState(0);
  const features = t.raw('features') as string[];

  useEffect(() => {
    const featureInterval = setInterval(() => {
      setFeatureIndex((prevIndex) => (prevIndex + 1) % features.length);
    }, 3000);
    return () => clearInterval(featureInterval);
  }, [features?.length]);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add({
      isDesktop: "(min-width: 768px)",
      isMobile: "(max-width: 767px)"
    }, (context) => {
      const conditions = context.conditions as { isMobile: boolean; isDesktop: boolean } | undefined;
      const isMobile = !!conditions?.isMobile;
      const timeline = gsap.timeline({ defaults: { ease: "none" } });

      timeline.to(
        ".floating-image",
        {
          x: (i) => (i % 2 === 0 ? "-120vw" : "120vw"),
          y: (i) => (i < floatImages.length / 2 ? "-120vh" : "120vh"),
          scale: 2.5,
          opacity: 0,
          stagger: {
            each: 0.15,
            from: "center",
          },
          duration: 3,
          ease: "power3.inOut",
        },
        0
      );

      timeline.fromTo(
        brandRef.current,
        { scale: 1, yPercent: -60 },
        {
          yPercent: -50,
          xPercent: isMobile ? 50 : 150,
          scale: isMobile ? 2500 : 1100,
          duration: 5,
          ease: "power2.inOut",
        },
        2
      )
        .to(brandRef.current, {
          backgroundColor: "black",
          color: "white",
          mixBlendMode: "multiply",
          duration: 0
        }, 2.5);

      timeline.fromTo(
        videoRef.current,
        { opacity: 0, scale: 1.1 },
        { opacity: 1, duration: 0.2, scale: 1.1, ease: "power3.inOut" },
        2.5
      );

      timeline.fromTo(
        textContainerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.2, ease: "power3.out" },
        2.5
      );

      ScrollTrigger.create({
        trigger: pinContainerRef.current,
        pin: true,
        start: "top top",
        end: "+=300%",
        scrub: 1,
        animation: timeline,
      });
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={pinContainerRef} className="relative z-0 h-svh overflow-hidden bg-gradient-radial-primary transparent">
      <div className="relative w-full h-svh overflow-hidden z-0 bg-transparent">

        {floatImages.map((img, id) => (
          <div
            key={id}
            className={`floating-image absolute squircle-element-camera overflow-hidden z-10 
      shadow-[-15px_-25px_60px_-30px_rgba(0,163,255,0.35)] 
      border border-white/10 backdrop-blur-md ${img.pos} ${img.size} 
      transition-all duration-700`}
          >
            <div className="relative w-full h-full bg-[#0a0a0a]">
              <div className="absolute inset-0 bg-linear-to-tr from-white/5 to-transparent z-0" />

              <img
                src={img.src}
                alt={`demo-${id}`}
                className="w-full h-full block object-cover z-10 contrast-[1.1] brightness-[0.9] saturate-[1.2]"
              />

              <div
                className="pointer-events-none absolute inset-0 z-20"
                style={{
                  background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.4) 100%)',
                  mixBlendMode: 'overlay',
                }}
              />

              <div className="pointer-events-none absolute inset-0 z-30 border-t border-white/20" />
            </div>
          </div>
        ))}

        <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center gap-6">

          <div
            ref={textContainerRef}
            className="absolute top-2 right-2 sm:top-6 sm:right-6 md:top-22 md:right-8 z-40 pointer-events-none select-none opacity-0"
          >
            <div className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-xl md:rounded-2xl px-1 py-1 md:px-6 md:py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-end min-w-45 sm:min-w-65 md:min-w-[320px]">
              <div className="h-2 md:h-6 w-full flex items-center justify-end overflow-hidden px-1">
                <AnimatePresence mode="wait">
                  <motion.h2
                    key={featureIndex}
                    initial={{ y: 30, opacity: 0, skewY: 10 }}
                    animate={{ y: 0, opacity: 1, skewY: 0 }}
                    exit={{ y: -30, opacity: 0, skewY: -10 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="text-[10px] sm:text-xl md:text-2xl font-black text-white italic tracking-tighter drop-shadow-[0_8px_8px_rgba(0,0,0,0.5)] uppercase whitespace-nowrap"
                  >
                    {features[featureIndex]}
                  </motion.h2>
                </AnimatePresence>
              </div>
              <motion.div
                key={`line-${featureIndex}`}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-px md:h-1 bg-linear-to-r from-transparent via-blue-500 to-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              />
            </div>
          </div>

          <h2 className="relative w-full h-full flex justify-center items-center pointer-events-none">
            <span
              ref={brandRef}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-full h-full flex justify-center items-center text-center bg-transparent mix-blend-screen pointer-events-none text-white"
            >
              <svg className="w-[80vw] max-w-150 h-auto mask-b-from-30% mask-b-to-99%" viewBox="0 0 633 194" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M103.134 107.981C105.925 92.1435 108.265 76.576 119.01 64.0971C133.912 46.7914 152.731 40.9116 174.689 46.2879C189.665 49.9545 197.837 60.7065 200.746 75.4457C205.842 101.264 189.119 130.568 164.479 139.231C149.37 144.542 135.044 144.252 122.367 132.11C119.577 137.387 119.396 142.908 118.307 148.111C115.621 160.949 113.22 173.851 110.987 186.776C110.202 191.321 108.429 193.524 103.5 192.916C98.2726 192.272 92.937 193.678 86.6763 192.498C92.1625 164.281 97.5956 136.338 103.134 107.981ZM142.28 120.621C151.263 122.549 159.131 120.209 165.869 114.153C173.693 107.121 177.764 98.0974 178.261 87.727C179.029 71.718 166.749 62.241 151.289 66.5312C138.427 70.1006 127.944 85.102 127.981 99.8879C128.006 110.294 132.318 116.812 142.28 120.621Z" />
                <path d="M603.442 121.106C589.992 136.993 573.365 144.444 552.834 141.813C532.672 139.229 519.379 123.784 519.725 103.273C520.039 84.7037 526.768 68.7806 541.11 56.6562C553.84 45.8935 568.43 41.9106 584.879 46.1438C590.462 47.5807 594.936 51.038 599.799 54.8294C602.823 44.2583 604.179 33.907 606.33 23.7337C607.669 17.3979 608.913 11.0394 610.048 4.66424C610.512 2.05885 611.768 0.988612 614.419 1.05772C619.081 1.17922 623.754 1.20797 628.414 1.04402C632.234 0.909572 633.365 2.29144 632.608 6.1293C628.845 25.2024 625.303 44.3191 621.628 63.41C619.525 74.3398 617.297 85.2455 615.163 96.1696C613.371 105.347 609.338 113.465 603.442 121.106ZM550.928 77.1706C547.366 81.8927 545.046 87.1389 543.802 92.9448C541.439 103.974 544.721 113.728 552.614 118.494C560.989 123.551 572.465 121.925 580.814 114.526C588.136 108.037 592.156 99.8021 593.249 90.2027C595.111 73.843 584.489 63.2459 568.875 65.8489C561.657 67.0522 556.055 71.1476 550.928 77.1706Z" />
                <path d="M228.253 138.133C210.379 127.671 203.62 110.332 208.637 88.4852C214.419 63.3067 235.448 45.2571 261.264 44.4367C281.948 43.7793 299.766 54.0981 302.52 77.6562C303.049 82.176 301.757 83.8384 297.588 85.0055C277.094 90.7435 256.676 96.7522 236.235 102.677C234.35 103.223 232.32 103.429 230.765 104.749C231.68 116.809 244.023 124.821 256.799 121.579C264.75 119.561 271.07 115.091 274.861 107.726C276.475 104.589 278.596 103.37 281.934 103.424C287.531 103.514 293.131 103.449 298.812 103.449C295.886 126.521 262.283 152.852 228.253 138.133ZM233.818 85.323C238.546 85.2204 242.833 83.2546 247.287 82.0462C257.147 79.3711 266.942 76.4543 276.785 73.6299C274.596 67.3805 267.363 63.4057 259.706 63.8475C246.96 64.5829 235.604 73.669 233.818 85.323Z" />
                <path d="M62.9133 44.9725C83.2609 47.0505 95.977 61.4009 97.1926 81.6589C98.8676 109.571 78.8816 135.646 52.1363 141.311C28.9054 146.232 7.52747 135.802 1.92562 115.654C-1.57551 103.061 -0.216118 90.561 5.30131 78.6889C15.0362 57.7419 31.2952 45.9557 54.5433 44.3729C57.1627 44.1946 59.8303 44.7245 62.9133 44.9725ZM24.2117 91.5522C24.0202 93.0374 23.8785 94.531 23.6295 96.0065C20.6802 113.486 35.0865 125.939 51.6519 119.787C64.7376 114.928 71.5567 104.595 73.3941 91.104C74.6452 81.917 73.2727 73.0755 64.2051 68.098C55.2604 63.1881 46.4518 65.1663 38.3144 70.6049C31.0535 75.4577 27.0109 82.6288 24.2117 91.5522Z" />
                <path d="M335.391 84.071C332.048 101.28 328.725 118.07 325.66 134.907C324.943 138.846 323.127 140.167 319.271 139.889C315.293 139.601 311.271 139.675 307.281 139.864C303.293 140.053 301.862 138.633 302.689 134.557C306.224 117.137 309.616 99.6873 313.046 82.2455C315.065 71.9775 317.197 61.7285 318.987 51.4203C319.624 47.748 321.253 46.3022 324.925 46.33C336.896 46.4204 341.7 44.9258 360.758 44.5892C376.868 42.6816 390.857 55.3259 393.147 71.4636C394.693 82.357 391.643 92.5918 389.88 103.021C388.109 113.503 385.813 123.895 383.928 134.36C383.238 138.191 381.793 140.295 377.42 139.885C373.29 139.499 369.093 139.674 364.933 139.811C361.092 139.937 360.058 138.534 360.841 134.685C363.984 119.217 366.855 103.694 369.818 88.1902C370.036 87.0503 370.266 85.9032 370.353 84.7491C371.211 73.3971 367.41 67.104 358.888 65.7084C347.953 63.9178 338.952 69.4989 336.284 79.7527C335.949 81.0385 335.761 82.3624 335.391 84.071Z" />
                <path d="M441.004 95.832C448.408 81.2445 455.87 67.0978 462.733 52.6656C465.114 47.6574 468.082 45.759 473.486 46.2176C478.703 46.6603 483.987 46.3134 488.814 46.3134C489.909 48.7025 489.014 49.8276 488.408 50.9564C473.376 78.9826 458.257 106.963 443.358 135.06C441.426 138.704 439.11 140.139 435.113 139.863C431.134 139.588 427.096 139.527 423.129 139.879C418.929 140.251 417.175 138.537 416.451 134.539C413.192 116.556 409.725 98.6108 406.376 80.6442C404.549 70.8436 402.967 60.9941 400.946 51.2346C400.159 47.4332 401.592 46.3747 404.936 46.3824C409.434 46.3929 413.938 46.504 418.427 46.2943C422.779 46.0909 424.518 47.8597 425.12 52.2637C427.634 70.683 430.517 89.0518 433.29 107.436C433.358 107.89 433.703 108.303 434.086 109.069C437.179 105.003 438.676 100.404 441.004 95.832Z" />
                <path d="M516.097 66.6983C511.66 89.9209 507.258 112.717 502.903 135.521C502.311 138.623 500.775 140.029 497.462 139.855C492.983 139.62 488.48 139.672 483.994 139.813C480.202 139.932 479.081 138.649 479.881 134.739C484.069 114.271 488.027 93.7566 492.049 73.2551C493.518 65.7675 495.019 58.2849 496.345 50.7716C496.858 47.8645 498.119 46.2925 501.233 46.3436C506.055 46.4228 510.879 46.378 515.702 46.3325C518.738 46.3038 519.886 47.4955 519.183 50.6448C518.027 55.8226 517.144 61.0612 516.097 66.6983Z" />
                <path d="M503.501 20.1523C500.655 10.8349 505.164 2.46105 513.757 0.411426C522.202 -1.60279 528.731 3.9868 528.028 12.6294C527.577 18.1794 523.214 23.1626 517.215 24.9798C511.545 26.6973 507.717 25.4373 503.501 20.1523Z" />
              </svg>
            </span>
            <div className="absolute inset-0 w-full h-full z-10 overflow-hidden">
              <div className="absolute inset-0 z-20 bg-linear-to-b from-transparent from-70% to-[#0C0C0D] pointer-events-none" />

              <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              >
                <source src="/images/pages/demo.mp4" type="video/mp4" />
              </video>
            </div>

          </h2>
          <p className="absolute bottom-10 z-30 text-white/80 font-semibold text-4xl">
            <Icon icon="iconoir:mouse-scroll-wheel" />
          </p>
        </div>
      </div>
    </section>
  );
}