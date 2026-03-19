"use client";

import { Icon } from "@iconify/react";

interface SliderControlProps {
    icon?: string;
    label: string;
    value: number;
    }

export function SliderControl({ icon, label, value }: SliderControlProps) {

    return (
        <div>
            <div className="flex items-center gap-2 text-sm mb-2 text-[#A1A1AA]">
                {icon && <Icon icon={icon} width="16" />}
                <span>{label}</span>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-[#27272A] rounded-full relative cursor-pointer">
                    <div
                        className="absolute left-0 top-0 h-full bg-gradient-primary rounded-full"
                        style={{ width: `${value}%` }}
                    ></div>
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white/70 rounded-full border border-white shadow"
                        style={{ left: `calc(${value}% - 7px)` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
