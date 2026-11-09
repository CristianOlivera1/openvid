import { AuthProvider } from "@/app/contexts/useAuth";
import RecordingOverlay from "../../components/ui/RecordingOverlay";
import { Mockup3dProvider } from "@/app/contexts/Mockup3dContext";
import { RecordingProvider } from "@/app/contexts/RecordingContext";

export default async function EditorLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <RecordingProvider>
                <Mockup3dProvider>
                    <div id="editor-root" className="min-h-screen bg-background">
                        {children}
                    </div>
                </Mockup3dProvider>
                <RecordingOverlay />
            </RecordingProvider>
        </AuthProvider>
    );
}
