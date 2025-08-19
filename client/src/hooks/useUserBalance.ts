import { useQuery } from '@tanstack/react-query';

export function useUserBalance(userId: string, enabled = true) {
  return useQuery({
    queryKey: [`/api/auth/balance/${userId}`],
    enabled: enabled && !!userId,
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 2000, // Consider data stale after 2 seconds
  });
}