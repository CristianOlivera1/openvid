"use client";
import { ReactNode } from "react";

interface StepRowProps {
    number: number;
    title: string;
    description: ReactNode;
    visual: ReactNode;
    actionButton?: ReactNode;
    isReversed: boolean;
}

export default function StepRow({
    number,
    title,
    description,
    visual,
    actionButton,
    isReversed
}: StepRowProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

            <div className={`order-1 ${isReversed ? "lg:order-2" : "lg:order-1"}`}>
                <div className="flex items-center gap-5 mb-6 drop-shadow-[1.2px_1.2px_100.2px_rgba(183,203,248,1)]">
                    <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#0E0E12] border border-white/10 text-white font-light text-2xl shrink-0 overflow-hidden group">

                        <div
                            className="absolute inset-0 opacity-40 transition-opacity group-hover:opacity-60"
                            style={{
                                backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0px, rgba(255,255,255,0.2) 1px, transparent 1px, transparent 10px)`,
                                maskImage: 'radial-gradient(circle, black 40%, transparent 100%)',
                                WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 100%)'
                            }}
                        />

                        <div className="absolute inset-0 rounded-full bg-linear-to-tr from-white/5 to-transparent pointer-events-none" />

                        <span className="relative z-10">{number}</span>
                    </span>

                    <h3 className="text-3xl md:text-4xl font-light tracking-tight text-white [text-shadow:0_0_60px_rgba(183,203,248,0.8),0_0_100px_rgba(183,203,248,0.7),0_0_200px_rgba(183,203,248,0.5),0_0_350px_rgba(183,203,248,0.3)]">
                        {title}
                    </h3>
                </div>
                <div className="text-lg text-neutral-400 mb-10 leading-relaxed font-light">
                    {description}
                </div>
                {actionButton && <div>{actionButton}</div>}
            </div>

            <div className={`order-2 ${isReversed ? "lg:order-1" : "lg:order-2"}`}>
                {visual}
            </div>

        </div>
    );
}