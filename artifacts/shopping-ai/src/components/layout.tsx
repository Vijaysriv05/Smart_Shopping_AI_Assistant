import { Navbar } from "./navbar";
import { FloatingAiButton } from "./floating-ai-button";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <Navbar />
      <main className="flex-1 flex flex-col relative z-10">
        {children}
      </main>
      <FloatingAiButton />
    </div>
  );
}
