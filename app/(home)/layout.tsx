"use client";

import "../globals.css";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";
import { RecordingProvider } from "@/hooks/RecordingContext";
import RecordingOverlay from "../components/ui/RecordingOverlay";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
    return (
        <RecordingProvider>
            <div className="flex min-h-screen flex-col text-neutral-300 bg-neutral-950">
                <Header />
                <main className="flex-1 w-full">
                    {children}
                </main>
                <Footer />
            </div>
            <RecordingOverlay />
        </RecordingProvider>
    );
}
