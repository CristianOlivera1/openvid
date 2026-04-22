"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";

export default function DemoVideo() {
    const t = useTranslations('demo');
    const videoRef = useRef<HTMLVideoElement>(null);
    const [featureIndex, setFeatureIndex] = useState(0);

    const features = t.raw('features') as string[];

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        videoRef.current?.play().catch(() => { });
                    } else {
                        videoRef.current?.pause();
                    }
                });
            },
            { threshold: 0.1 }
        );

        if (videoRef.current) {
            observer.observe(videoRef.current);
        }

        const featureInterval = setInterval(() => {
            setFeatureIndex((prevIndex) => (prevIndex + 1) % features.length);
        }, 3000);

        return () => {
            observer.disconnect();
            clearInterval(featureInterval);
        };
    }, [features.length]);

    return (
        <div className="w-full flex flex-col items-center pb-30">
            <h2 className="text-4xl md:text-6xl text-center font-bold tracking-tighter text-white mb-10 leading-tight drop-shadow-[1.2px_1.2px_100.2px_rgba(183,203,248,1)]">
                {t('title')} <br />
                <span className="bg-linear-to-r from-[#003780] to-white bg-clip-text text-transparent">
                    {t('subtitle')}
                </span>
            </h2>

            <div className="relative group w-full overflow-hidden rounded-[32px] border border-white/10 bg-[#0E0E12] transform-gpu transition-all duration-700 
                    shadow-[-15px_-25px_60px_-30px_rgba(0,163,255,0.35)] 
                    hover:shadow-[-15px_-30px_80px_-15px_rgba(0,163,255,0.35)] 
                    hover:border-white/20">
                
                <div className="absolute -inset-px bg-linear-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none" />

                <div className="absolute top-2 right-2 sm:top-6 sm:right-6 md:top-8 md:right-8 z-20 pointer-events-none select-none">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-xl md:rounded-2xl px-1 py-1 md:px-6 md:py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-end min-w-45 sm:min-w-65 md:min-w-[320px]">
                        <div className="h-2 md:h-6 w-full flex items-center justify-end overflow-hidden px-1">
                            <AnimatePresence mode="wait">
                                <motion.h2
                                    key={featureIndex}
                                    initial={{ y: 30, opacity: 0, skewY: 10 }}
                                    animate={{ y: 0, opacity: 1, skewY: 0 }}
                                    exit={{ y: -30, opacity: 0, skewY: -10 }}
                                    transition={{
                                        duration: 0.6,
                                        ease: [0.16, 1, 0.3, 1]
                                    }}
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

                <div className="relative z-0 w-full mask-b-from-70% mask-b-to-95%">
                    <video
                        ref={videoRef}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        poster="/images/pages/demo-poster.avif"
                        className="w-full h-auto object-cover transform-gpu transition-transform duration-1000 group-hover:scale-105"
                    >
                       <source src="/images/pages/demo.mp4" type="video/mp4" />
                    </video>
                </div>
            </div>
        </div>
    );
}
