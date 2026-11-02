"use client";

import type { ReactNode } from "react";

interface TabButtonProps {
    label: string;
    isActive?: boolean;
    onClick?: () => void;
    children?: ReactNode;
    className?: string;
    activeClassName?: string;
    inactiveClassName?: string;
}

export function TabButton({
    label,
    isActive = false,
    onClick,
    children,
    className = "flex-1 py-1.5 rounded-md transition",
    activeClassName = "bg-background text-foreground shadow-xs",
    inactiveClassName = "hover:text-foreground text-muted-foreground",
}: TabButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-pressed={isActive}
            className={`${className} ${isActive ? activeClassName : inactiveClassName}`}
        >
            {children ?? label}
        </button>
    );
}
