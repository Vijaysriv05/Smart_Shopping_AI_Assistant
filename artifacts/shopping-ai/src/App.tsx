import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { setSessionIdGetter, setAuthTokenGetter } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "@/components/layout";
import { getSessionId, getAuthToken } from "@/lib/session";

// Pages
import Home from "@/pages/home";
import Agent from "@/pages/agent";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import Compare from "@/pages/compare";
import Dashboard from "@/pages/dashboard";
import Cart from "@/pages/cart";
import Wishlist from "@/pages/wishlist";
import Profile from "@/pages/profile";
import Autonomous from "@/pages/autonomous";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/agent" component={Agent} />
        <Route path="/products" component={Products} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/compare" component={Compare} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/cart" component={Cart} />
        <Route path="/wishlist" component={Wishlist} />
        <Route path="/profile" component={Profile} />
        <Route path="/autonomous" component={Autonomous} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  useEffect(() => {
    setSessionIdGetter(() => getSessionId());
    setAuthTokenGetter(() => getAuthToken());
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="shopping-ai-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
          <SonnerToaster position="bottom-right" richColors />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
