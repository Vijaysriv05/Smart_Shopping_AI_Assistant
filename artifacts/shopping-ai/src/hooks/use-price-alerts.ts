import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useGetPriceAlerts } from "@workspace/api-client-react";

const STORAGE_KEY = "price-alerts-shown";
const ALERT_TTL_MS = 60 * 60 * 1000; // re-notify after 1 hour

function getShownAlerts(): Record<number, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function markAlertShown(productId: number) {
  const shown = getShownAlerts();
  shown[productId] = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shown));
}

function shouldShow(productId: number): boolean {
  const shown = getShownAlerts();
  const ts = shown[productId];
  if (!ts) return true;
  return Date.now() - ts > ALERT_TTL_MS;
}

export function usePriceAlerts() {
  const result = useGetPriceAlerts();
  const alerts = result.data;

  const fired = useRef(false);
  useEffect(() => {
    if (!alerts || alerts.length === 0 || fired.current) return;
    fired.current = true;

    const pending = alerts.filter((a) => shouldShow(a.productId));
    if (pending.length === 0) return;

    // Stagger toasts so they don't all pop at once
    pending.slice(0, 4).forEach((alert, i) => {
      setTimeout(() => {
        toast.success(`Price drop: ${alert.productName}`, {
          description: `${alert.discount}% off — now $${(alert.currentPrice / 100).toFixed(2)} (was $${(alert.originalPrice / 100).toFixed(2)})`,
          duration: 6000,
          action: {
            label: "View deal",
            onClick: () => {
              window.location.href = `/products/${alert.productId}`;
            },
          },
        });
        markAlertShown(alert.productId);
      }, i * 800);
    });
  }, [alerts]);
}
