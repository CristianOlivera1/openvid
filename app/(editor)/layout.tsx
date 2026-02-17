export default function EditorLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-neutral-950">
            {children}
        </div>
    );
}
