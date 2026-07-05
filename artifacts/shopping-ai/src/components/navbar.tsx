import { Link, useLocation } from "wouter";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { Bot, ShoppingCart, Heart, Search, Menu, UserCircle2, LogIn, LogOut, Bell } from "lucide-react";
import { useGetCart, useGetWishlist } from "@workspace/api-client-react";
import { getAuthUser, clearAuthSession, isAuthenticated, getSessionId } from "@/lib/session";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useEffect } from "react";

function NotificationDropdown() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = () => {
    fetch("/api/ai/notifications", {
      headers: {
        "x-session-id": getSessionId(),
      }
    })
      .then(res => res.json())
      .then(data => setAlerts(data))
      .catch(err => console.error("Error fetching notifications:", err));
  };

  const handleReadAll = () => {
    fetch("/api/ai/notifications/read-all", { 
      method: "POST",
      headers: {
        "x-session-id": getSessionId(),
      }
    })
      .then(() => loadAlerts())
      .catch(err => console.error(err));
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShow(!show)}
        className={`relative ${unreadCount > 0 ? "text-primary" : ""}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </Button>

      {show && (
        <div className="absolute right-0 mt-2 w-80 bg-card border rounded-2xl p-4 shadow-xl z-50 text-xs space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="font-bold text-foreground">AI Price & Coupon Alerts</span>
            {unreadCount > 0 && (
              <button onClick={handleReadAll} className="text-primary hover:underline font-semibold">
                Mark all read
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No alerts yet.</div>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    alert.isRead ? "bg-muted/20 border-muted" : "bg-primary/5 border-primary/20"
                  }`}
                >
                  <p className="text-foreground leading-normal">{alert.message}</p>
                  <span className="text-[9px] text-muted-foreground mt-1 block">
                    {new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export function Navbar() {
  const [location] = useLocation();
  const user = getAuthUser();
  const loggedIn = isAuthenticated();
  const { data: cartItems } = useGetCart();
  const { data: wishlistItems } = useGetWishlist();

  const cartCount = cartItems?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const wishlistCount = wishlistItems?.length || 0;

  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: "/products", label: "Catalog" },
    { href: "/agent", label: "AI Agent", isAi: true },
    { href: "/compare", label: "Compare" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/autonomous", label: "AI Command", isCommand: true },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-ai-gradient p-1.5 rounded-lg text-white group-hover:scale-110 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Goval AI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === link.href ? "text-foreground" : "text-muted-foreground"
                } ${link.isAi ? "text-ai-gradient ai-glow-text font-bold" : ""} ${(link as any).isCommand ? "flex items-center gap-1 text-violet-400 hover:text-violet-300 font-bold" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex items-center relative mr-2 text-muted-foreground">
            <Search className="w-4 h-4 absolute left-3" />
            <input 
              type="text" 
              placeholder="Ask AI to find..." 
              className="h-9 w-64 rounded-full border border-input bg-muted/50 px-9 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:bg-background transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  window.location.href = `/agent?q=${encodeURIComponent(e.currentTarget.value)}`;
                }
              }}
            />
          </div>

          <ThemeToggle />

          {loggedIn ? (
            <>
              <span className="hidden lg:inline text-xs text-muted-foreground">{user?.name}</span>
              <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={() => { clearAuthSession(); window.location.href = "/"; }} title="Sign out">
                <LogOut className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="icon" className="hidden sm:flex" title="Sign in">
                <LogIn className="w-5 h-5" />
              </Button>
            </Link>
          )}

          <NotificationDropdown />

          <Link href="/profile">
            <Button variant="ghost" size="icon" className={`hidden sm:flex ${location === "/profile" ? "text-primary" : ""}`}>
              <UserCircle2 className="w-5 h-5" />
            </Button>
          </Link>

          <Link href="/wishlist">
            <Button variant="ghost" size="icon" className="relative hidden sm:flex">
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {wishlistCount}
                </span>
              )}
            </Button>
          </Link>

          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-6 py-6">
                <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2">
                  <div className="bg-ai-gradient p-1.5 rounded-lg text-white">
                    <Bot className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-lg">Goval AI</span>
                </Link>
                
                <nav className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`text-lg font-medium transition-colors hover:text-primary ${
                        location === link.href ? "text-foreground" : "text-muted-foreground"
                      } ${link.isAi ? "text-ai-gradient font-bold" : ""}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="h-px bg-border my-2" />
                  <Link href="/wishlist" onClick={() => setIsOpen(false)} className="text-lg font-medium text-muted-foreground hover:text-primary flex items-center justify-between">
                    Wishlist
                    {wishlistCount > 0 && <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">{wishlistCount}</span>}
                  </Link>
                  <Link href="/profile" onClick={() => setIsOpen(false)} className="text-lg font-medium text-muted-foreground hover:text-primary">
                    My Profile
                  </Link>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
