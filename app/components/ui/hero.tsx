import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import Link from "next/link";

export default function Hero() {
    return (
        <>
            <h1 className="text-5xl md:text-7xl font-semibold text-white tracking-tight mb-6 leading-[1.1] drop-shadow-[1.2px_1.2px_100.2px_rgba(183,203,248,1)]">
                Grabación de{" "}
                <span className="relative inline-flex items-center">
                    <img
                        src="/svg/pantalla.svg"
                        alt="Pantalla"
                        className="inline-block h-[1.6em] w-auto align-middle translate-y-[0.1em] sm:translate-y-[0.3em]"
                    />

                    <img
                        src="/svg/cursor-animate.svg"
                        className="absolute -top-30 -right-30 h-[4em] w-auto"
                        alt="Decoración"
                    />
                </span>
                <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-neutral-200 via-neutral-400 to-[#003780]">
                    edición rápida
                </span>
            </h1>

            <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
                Graba tu navegador, añade zooms suaves y personaliza fondos en segundos. Crea demos profesionales sin el editor de video complejo.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                <Button asChild variant="primary" size="xl" className="text-xl">
                    <Link href="/editor"><div className="size-9 rounded-full bg-white flex items-center justify-center">
                        <Icon icon="fluent:screenshot-record-16-regular" className="size-7 text-red-500" />
                    </div>
                        Empezar a grabar</Link>
                </Button>
            </div>
        </>
    );
}