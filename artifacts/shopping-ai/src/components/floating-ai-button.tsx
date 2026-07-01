import { Bot } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function FloatingAiButton() {
  const [location] = useLocation();

  if (location === "/agent") return null;

  return (
    <Link href="/agent">
      <div className="fixed bottom-6 right-6 z-50 group cursor-pointer">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className={cn(
          "relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-transform duration-300 group-hover:scale-110",
          "bg-ai-gradient text-white ai-glow"
        )}>
          <Bot className="w-6 h-6 animate-pulse" />
        </div>
      </div>
    </Link>
  );
}
