import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiJson } from "@/lib/queryClient";
import type { TradingAccount } from "@shared/schema";

type PublicTradingAccount = Omit<TradingAccount, "apiKeyEncrypted" | "apiSecretEncrypted" | "accessTokenEncrypted" | "refreshTokenEncrypted">;

type TradingMode = "paper" | "live";

interface TradingModeContextType {
  tradingMode: TradingMode;
  isLoadingMode: boolean;
  setMode: (mode: TradingMode) => void;
  connectedLiveAccount: PublicTradingAccount | null;
  isLoadingAccounts: boolean;
  showConfirmation: boolean;
  setShowConfirmation: (show: boolean) => void;
}

const TradingModeContext = createContext<TradingModeContextType | undefined>(undefined);

export function TradingModeProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [tradingMode, setTradingMode] = useState<TradingMode>("paper");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Fetch current mode from backend
  const { data: modeData, isLoading: isLoadingMode } = useQuery<{ mode: TradingMode }>({
    queryKey: ["/api/trading/mode"],
    queryFn: async () => {
      if (!token) return { mode: "paper" as const };
      return apiJson<{ mode: TradingMode }>("/api/trading/mode");
    },
    enabled: !!token,
  });

  // Fetch accounts to check live broker status
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery<PublicTradingAccount[]>({
    queryKey: ["/api/trading/accounts"],
    queryFn: async () => {
      if (!token) return [];
      return apiJson<PublicTradingAccount[]>("/api/trading/accounts");
    },
    enabled: !!token,
  });

  const connectedLiveAccount = accounts.find(
    (acc) => acc.mode === "live" && acc.status === "connected"
  ) || null;

  useEffect(() => {
    if (modeData?.mode) {
      setTradingMode(modeData.mode);
    }
  }, [modeData]);

  // Mutation to update mode
  const modeMutation = useMutation({
    mutationFn: async (newMode: TradingMode) => {
      const res = await fetch("/api/trading/mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ mode: newMode })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update trading mode");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setTradingMode(data.mode);
      queryClient.invalidateQueries({ queryKey: ["/api/trading/mode"] });
      toast({
        title: `Switched to ${data.mode === "live" ? "Broker Sandbox" : "Practice Mode"}`,
        description: data.mode === "live" 
          ? "Orders are simulated against a connected broker profile. No real order is sent." 
          : "You are now trading with practice money.",
        variant: data.mode === "live" ? "default" : "default"
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Mode Switch Denied",
        description: err.message || "Please connect a broker sandbox profile first.",
      });
      if (err.message?.toLowerCase().includes("connect a broker")) {
        setLocation("/connect-broker");
      }
    }
  });

  const setMode = (newMode: TradingMode) => {
    if (newMode === "live") {
      if (!connectedLiveAccount) {
        toast({
          variant: "destructive",
          title: "Broker Account Required",
          description: "Please connect a broker sandbox profile before enabling Sandbox Mode.",
        });
        setLocation("/connect-broker");
        return;
      }
      // If live broker connected, trigger confirmation modal popup flow
      setShowConfirmation(true);
    } else {
      modeMutation.mutate("paper");
    }
  };

  const confirmLiveMode = () => {
    setShowConfirmation(false);
    modeMutation.mutate("live");
  };

  return (
    <TradingModeContext.Provider
      value={{
        tradingMode,
        isLoadingMode,
        setMode,
        connectedLiveAccount,
        isLoadingAccounts,
        showConfirmation,
        setShowConfirmation,
      }}
    >
      {children}

      {/* ─── Broker Sandbox Confirmation Modal ─── */}
      {showConfirmation && (
        <LiveModeConfirmationModal
          onClose={() => setShowConfirmation(false)}
          onConfirm={confirmLiveMode}
        />
      )}
    </TradingModeContext.Provider>
  );
}

export function useTradingMode() {
  const context = useContext(TradingModeContext);
  if (!context) {
    throw new Error("useTradingMode must be used within a TradingModeProvider");
  }
  return context;
}

// ─── Live Mode Confirmation Modal Component ───
interface LiveModeConfirmationModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

function LiveModeConfirmationModal({ onClose, onConfirm }: LiveModeConfirmationModalProps) {
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);
  const [checked3, setChecked3] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const isConfirmed = checked1 && checked2 && checked3 && confirmText.toUpperCase() === "SANDBOX";

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[9999] animate-fade-in select-none text-left">
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ background: "var(--color-card-deep)", borderColor: "#ef4444" }}>
        <h3 className="text-lg font-black text-red-500 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle"></i>
          Switch to Broker Sandbox?
        </h3>
        
        <p className="text-xs font-semibold text-slate-400 mt-2 leading-relaxed">
          This environment simulates broker orders for product testing. It does not verify credentials or send orders to a real broker.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex items-start gap-3 cursor-pointer text-xs font-semibold text-slate-300">
            <input
              type="checkbox"
              checked={checked1}
              onChange={(e) => setChecked1(e.target.checked)}
              className="mt-0.5"
            />
            <span>I understand this is a simulation and no real order is sent.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer text-xs font-semibold text-slate-300">
            <input
              type="checkbox"
              checked={checked2}
              onChange={(e) => setChecked2(e.target.checked)}
              className="mt-0.5"
            />
            <span>I understand sandbox fills and balances are illustrative.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer text-xs font-semibold text-slate-300">
            <input
              type="checkbox"
              checked={checked3}
              onChange={(e) => setChecked3(e.target.checked)}
              className="mt-0.5"
            />
            <span>I want to switch from Practice Mode to Broker Sandbox.</span>
          </label>
        </div>

        <div className="mt-5">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
            Type "SANDBOX" to confirm
          </label>
          <input
            type="text"
            placeholder="Type SANDBOX here"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full h-10 rounded-lg px-3 bg-slate-900 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-400 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!isConfirmed}
            className="h-10 px-6 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-extrabold transition-all cursor-pointer"
          >
            Enter Broker Sandbox
          </button>
        </div>
      </div>
    </div>
  );
}
