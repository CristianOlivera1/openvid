"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        isScrolled
          ? "border-b border-white/10 bg-[#050505]/80 backdrop-blur-xl py-0"
          : "bg-transparent border-transparent py-2"
      )}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Image src="/svg/logo-openvid.svg" alt="Logo" width={50} height={50} />
          <span className="hidden sm:flex text-white font-semibold text-lg transition-colors group-hover:text-neutral-200">
            Free
            <span className="relative inline-block px-1 ml-0.5">
              <span className="absolute inset-0 bg-blue-500/20 border border-dashed border-blue-400/50 rounded-sm -rotate-1" />

              <span className="relative">Shot</span>

              <div className="absolute -bottom-1 -right-1 size-2 bg-sky-500 border border-white rounded-full shadow-lg" />
            </span>
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
          <a href="#docs" className="hover:text-white transition-colors">Documentación</a>
          <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button asChild variant="outline">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild variant="primary">
            <Link href="/editor">Empezar a grabar
              <Icon icon="solar:arrow-right-linear" width="16" className="hidden sm:flex" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
