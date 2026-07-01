import { Navbar } from "./navbar";
import { FloatingAiButton } from "./floating-ai-button";
import { usePriceAlerts } from "@/hooks/use-price-alerts";

function PriceAlertWatcher() {
  usePriceAlerts();
  return null;
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <PriceAlertWatcher />
      <Navbar />
      <main className="flex-1 flex flex-col relative z-10">
        {children}
      </main>
      <FloatingAiButton />
    </div>
  );
}
