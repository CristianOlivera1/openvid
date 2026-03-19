"use client";

import { Icon } from "@iconify/react";

interface SidebarToolProps {
    icon: string;
    isActive?: boolean;
    onClick?: () => void;
}

export function SidebarTool({ icon, isActive, onClick }: SidebarToolProps) {
    return (
        <button
            onClick={onClick}
            className={`p-2 rounded-md transition ${
                isActive
                    ? "bg-white/10 text-white"
                    : "hover:bg-white/5 text-[#A1A1AA]"
            }`}
        >
            <Icon icon={icon} width="20" />
        </button>
    );
}
