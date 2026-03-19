"use client";

interface TabButtonProps {
    label: string;
    isActive?: boolean;
    onClick?: () => void;
}

export function TabButton({ label, isActive, onClick }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 py-1.5 rounded-md transition ${
                isActive
                    ? "bg-white/10 text-white"
                    : "hover:text-white text-[#A1A1AA]"
            }`}
        >
            {label}
        </button>
    );
}
