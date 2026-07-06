import { useQuery } from "@tanstack/react-query";
import type { LivePrice } from "@/lib/types";

interface LivePricesResponse {
  prices: Record<string, LivePrice>;
  marketOpen: boolean;
}

/** Polls /api/live-prices every 10s and exposes the latest quote map. */
export function useLivePrices() {
  const { data } = useQuery<LivePricesResponse>({
    queryKey: ["/api/live-prices"],
    queryFn: () => fetch("/api/live-prices").then(r => r.json()),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
  return { prices: data?.prices ?? {}, marketOpen: data?.marketOpen ?? false };
}
