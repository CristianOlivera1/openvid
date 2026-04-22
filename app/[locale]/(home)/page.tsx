import { BentoDemos } from "@/app/components/ui/BentoDemos";
import DonationCard from "@/app/components/ui/DonationCard";
import EditorPreview from "@/app/components/ui/EditorPreview";
import Hero from "@/app/components/ui/Hero";
import { HeroScrollMask } from "@/app/components/ui/HeroScrollMask";
import InteractiveRecordingSteps from "@/app/components/ui/RecordingSteps";

export default function Home() {
  return (
    <div className="flex flex-col">
      <div className="relative overflow-hidden bg-gradient-radial-primary w-full">

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-250 h-[150%] rounded-[100%] blur-3xl pointer-events-none -z-10"></div>

        <section className="pt-32 pb-6 sm:pb-14 bg-gradient-radial-primary">
          <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
            <Hero />
          </div>
        </section>

        <section className="w-full">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-250 h-[150%] rounded-[100%] blur-3xl pointer-events-none -z-10"></div>
          <HeroScrollMask />
        </section>
      </div>
      <section className="w-full py-16">
        <div className="max-w-6xl mx-auto px-6">
          <InteractiveRecordingSteps />
        </div>
      </section>

      <section className="pt-8 pb-0 sm:py-2 w-full mb-0 sm:mb-42">
        <div className="max-w-xl mx-auto px-6">
          <DonationCard />
        </div>
      </section>

      <div className="relative overflow-hidden bg-gradient-radial-primary w-full py-20 pb-40">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-250 h-[150%] rounded-[100%] blur-xl pointer-events-none "></div>
        <section className="w-full">
          <div className="max-w-6xl mx-auto px-6 mb-14">
            <EditorPreview />
          </div>
          {/* <BentoDemos /> */}
        </section>
      </div>
    </div>
  );
}