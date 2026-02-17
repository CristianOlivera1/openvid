import "../globals.css";
import Header from "../components/common/header";
import Footer from "../components/common/footer";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col text-neutral-300 bg-neutral-950">
            <Header />
            <main className="flex-1 w-full">
                {children}
            </main>
            <Footer />
        </div>
    );
}
