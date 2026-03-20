"use client";
import "../../globals.css";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import Image from "next/image";
import Link from "next/link";

export default function Login() {
  return (
    <div className="min-h-screen w-full bg-[#030303] grid lg:grid-cols-2 text-white selection:bg-white/30">
      <div className="relative flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32">

        <div className="absolute top-8 left-8 sm:left-12 lg:left-16">
          <Button
            variant="ghost"
            size="sm"
            className="text-neutral-500 hover:text-white hover:bg-white/5 tracking-wide text-xs uppercase"
            asChild
          >
            <Link href="/">
              <Icon icon="solar:arrow-left-linear" className="mr-2" width="16" />
              Volver
            </Link>
          </Button>
        </div>

        <div className="w-full max-w-sm mx-auto mt-16 lg:mt-0">
          <div className="mb-10">
            <Image src="/svg/logo-openvid.svg" alt="Logo" width={60} height={60} className="mb-4" />
            <h1 className="text-3xl sm:text-4xl font-light tracking-tighter text-white mb-3">
              Bienvenido
            </h1>
            <p className="text-neutral-300 text-md font-light tracking-wide">
              Inicia sesión para empezar a crear tomas cinemáticas.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 gap-3 text-white border-white/10 bg-transparent hover:bg-white/5 transition-all font-light rounded-none"
            >
              <Icon icon="logos:google-icon" width="18" />
              Continuar con Google
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 gap-3 text-white border-white/10 bg-transparent hover:bg-white/5 transition-all font-light rounded-none"
            >
              <Icon icon="mdi:github" className="text-white size-5" />
              Continuar con GitHub
            </Button>
          </div>

          <p className="mt-12 text-md text-neutral-300 leading-relaxed font-light">
            Al continuar, aceptas nuestros: <br />
            <Link href="/terms" className="text-neutral-300 hover:text-white underline decoration-white/30 underline-offset-4 transition-colors">Términos de Servicio</Link> y{" "}
            <Link href="/privacy" className="text-neutral-300 hover:text-white underline decoration-white/30 underline-offset-4 transition-colors">Política de Privacidad</Link>.
          </p>
        </div>
      </div>
      <div className="hidden lg:block relative w-full h-full border-l border-white/10 bg-black overflow-hidden group">
        <Image
          src="https://images.unsplash.com/photo-1526512340740-9217d0159da9?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dmVydGljYWx8ZW58MHx8MHx8fDA%3D"
          alt="Cinematic Shot"
          fill
          className="object-cover opacity-70 mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-700 ease-in-out"
          priority
        />

        <div className="absolute inset-0 bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>

        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 pointer-events-none"></div>
        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-white/10 pointer-events-none"></div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/20 pointer-events-none flex items-center justify-center">
          <div className="w-2 h-2 bg-white/50 rounded-full"></div>
        </div>

        <div className="absolute top-8 left-8 w-4 h-4 border-t border-l border-white/40 pointer-events-none"></div>
        <div className="absolute bottom-8 left-8 w-4 h-4 border-b border-l border-white/40 pointer-events-none"></div>
        <div className="absolute top-8 right-8 w-4 h-4 border-t border-r border-white/40 pointer-events-none"></div>

      </div>
    </div>
  );
}