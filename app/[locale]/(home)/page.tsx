import { CarouselDemos } from "@/app/components/ui/CarouselDemos";
import DonationCard from "@/app/components/ui/DonationCard";
import EditorPreview from "@/app/components/ui/EditorPreview";
import Hero from "@/app/components/ui/Hero";
import { HeroScrollMask } from "@/app/components/ui/HeroScrollMask";
import InteractiveRecordingSteps from "@/app/components/ui/RecordingSteps";

export default function Home() {
  return (
    <div className="flex flex-col">
      <div className="relative overflow-hidden bg-gradient-radial-primary w-full">

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-75 h-75 rounded-full bg-cyan-500/15 blur-[80px] pointer-events-none z-0" />

        <section className="pt-32 pb-6 sm:pb-14 bg-gradient-radial-primary">
          <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
            <Hero />
          </div>
        </section>

        <section className="w-full">
          <HeroScrollMask />
        </section>
      </div>
      <section className="w-full py-10 sm:py-16">
        <div className="max-w-6xl mx-auto px-6">
          <InteractiveRecordingSteps />
        </div>
      </section>

      <div className="relative overflow-hidden bg-gradient-radial-primary w-full pt-0 pb-30 sm:py-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-250 h-[150%] rounded-[100%] blur-xl pointer-events-none "></div>
        <section className="w-full">
          <div className="w-full mx-auto bg-[url('/images/pages/dots.svg')] bg-no-repeat bg-contain bg-center">
            <EditorPreview />
          </div>
          <CarouselDemos />
          <section className="pt-4 pb-10 sm:py-2 w-full mb-0 sm:mb-42">
            <div
              className="absolute left-1/2 -translate-x-1/2 w-150 h-500 pointer-events-none z-0 pro-glow"
              style={{
                mixBlendMode: 'plus-lighter',
                willChange: 'filter, background',
                background: 'radial-gradient(circle at var(--glow-x) 20%, rgba(6, 182, 212, 0.25) 0%, transparent 70%)'
              }}
            />
            <div className="max-w-xl mx-auto px-6">
              <DonationCard />
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}