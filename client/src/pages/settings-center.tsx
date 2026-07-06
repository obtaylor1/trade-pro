import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Recommended default states for easy resets
const RECOMMENDED_SETTINGS = {
  theme: "dark",
  accentColor: "blue",
  density: "comfortable",
  cardStyle: "beginner",
  experienceMode: "beginner",
  showPlainExplanations: true,
  showAdvancedTerms: false,
  showLearningTips: true,
  hideProIndicators: true,
  defaultTradingMode: "practice",
  defaultMarket: "forex",
  defaultTradeAmount: "0.25",
  defaultTradeDuration: "quick",
  confirmPracticeTrades: true,
  requireLiveTyping: true,
  priceRefreshSpeed: "normal",
  showMarketStatus: true,
  showAfterHoursWarning: true,
  showDataDelayWarning: true,
  timezone: "eastern",
  saveTradeHistory: true,
  saveLearningProgress: true,
  useHistoryForRecommendations: true,
  largerText: false,
  highContrast: false,
  reduceAnimations: false,
  colorblindFriendly: true,
  alwaysShowWordsWithColors: true,
};

const DEFAULT_NOTIFS = {
  tradeOpened: { email: true, push: true, sms: false },
  tradeClosed: { email: true, push: true, sms: false },
  tradeWon: { email: true, push: true, sms: false },
  tradeLost: { email: true, push: true, sms: false },
  stopLossHit: { email: true, push: true, sms: true },
  profitTargetReached: { email: true, push: true, sms: true },
  liveOrderPlaced: { email: true, push: true, sms: true },
  liveOrderFilled: { email: true, push: true, sms: true },
  liveOrderRejected: { email: true, push: true, sms: true },
  brokerDisconnected: { email: true, push: true, sms: true },
  buyingPowerLow: { email: true, push: true, sms: true },
  dailySummary: { email: true, push: false, sms: false },
  weeklyProgress: { email: true, push: false, sms: false },
  newLesson: { email: false, push: true, sms: false },
  riskReminder: { email: true, push: true, sms: false },
};

export default function SettingsPage() {
  const { toast } = useToast();

  // App Appearance
  const [theme, setTheme] = useState(RECOMMENDED_SETTINGS.theme);
  const [accentColor, setAccentColor] = useState(RECOMMENDED_SETTINGS.accentColor);
  const [density, setDensity] = useState(RECOMMENDED_SETTINGS.density);
  const [cardStyle, setCardStyle] = useState(RECOMMENDED_SETTINGS.cardStyle);

  // Apply theme class
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
    }
  }, [theme]);

  // Trading Experience
  const [experienceMode, setExperienceMode] = useState(RECOMMENDED_SETTINGS.experienceMode);
  const [showPlainExplanations, setShowPlainExplanations] = useState(RECOMMENDED_SETTINGS.showPlainExplanations);
  const [showAdvancedTerms, setShowAdvancedTerms] = useState(RECOMMENDED_SETTINGS.showAdvancedTerms);
  const [showLearningTips, setShowLearningTips] = useState(RECOMMENDED_SETTINGS.showLearningTips);
  const [hideProIndicators, setHideProIndicators] = useState(RECOMMENDED_SETTINGS.hideProIndicators);

  // Trade Defaults
  const [defaultTradingMode, setDefaultTradingMode] = useState(RECOMMENDED_SETTINGS.defaultTradingMode);
  const [defaultMarket, setDefaultMarket] = useState(RECOMMENDED_SETTINGS.defaultMarket);
  const [defaultTradeAmount, setDefaultTradeAmount] = useState(RECOMMENDED_SETTINGS.defaultTradeAmount);
  const [defaultTradeDuration, setDefaultTradeDuration] = useState(RECOMMENDED_SETTINGS.defaultTradeDuration);

  // Trade Confirmations
  const [confirmPracticeTrades, setConfirmPracticeTrades] = useState(RECOMMENDED_SETTINGS.confirmPracticeTrades);
  const [requireLiveTyping, setRequireLiveTyping] = useState(RECOMMENDED_SETTINGS.requireLiveTyping);

  // Market Data
  const [priceRefreshSpeed, setPriceRefreshSpeed] = useState(RECOMMENDED_SETTINGS.priceRefreshSpeed);
  const [showMarketStatus, setShowMarketStatus] = useState(RECOMMENDED_SETTINGS.showMarketStatus);
  const [showAfterHoursWarning, setShowAfterHoursWarning] = useState(RECOMMENDED_SETTINGS.showAfterHoursWarning);
  const [showDataDelayWarning, setShowDataDelayWarning] = useState(RECOMMENDED_SETTINGS.showDataDelayWarning);
  const [timezone, setTimezone] = useState(RECOMMENDED_SETTINGS.timezone);

  // Data & Privacy
  const [saveTradeHistory, setSaveTradeHistory] = useState(RECOMMENDED_SETTINGS.saveTradeHistory);
  const [saveLearningProgress, setSaveLearningProgress] = useState(RECOMMENDED_SETTINGS.saveLearningProgress);
  const [useHistoryForRecommendations, setUseHistoryForRecommendations] = useState(RECOMMENDED_SETTINGS.useHistoryForRecommendations);

  // Accessibility
  const [largerText, setLargerText] = useState(RECOMMENDED_SETTINGS.largerText);
  const [highContrast, setHighContrast] = useState(RECOMMENDED_SETTINGS.highContrast);
  const [reduceAnimations, setReduceAnimations] = useState(RECOMMENDED_SETTINGS.reduceAnimations);
  const [colorblindFriendly, setColorblindFriendly] = useState(RECOMMENDED_SETTINGS.colorblindFriendly);
  const [alwaysShowWordsWithColors, setAlwaysShowWordsWithColors] = useState(RECOMMENDED_SETTINGS.alwaysShowWordsWithColors);

  // Notifications
  const [notifs, setNotifs] = useState(DEFAULT_NOTIFS);

  // Confirmation Modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Helpers
  const handleToggleNotif = (key: keyof typeof DEFAULT_NOTIFS, channel: "email" | "push" | "sms") => {
    setNotifs(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [channel]: !prev[key][channel],
      }
    }));
  };

  const handleSave = () => {
    toast({
      title: "✅ Settings Saved Successfully",
      description: "Your local preferences and alert rules have been updated.",
    });
  };

  const handleReset = () => {
    setTheme(RECOMMENDED_SETTINGS.theme);
    setAccentColor(RECOMMENDED_SETTINGS.accentColor);
    setDensity(RECOMMENDED_SETTINGS.density);
    setCardStyle(RECOMMENDED_SETTINGS.cardStyle);
    setExperienceMode(RECOMMENDED_SETTINGS.experienceMode);
    setShowPlainExplanations(RECOMMENDED_SETTINGS.showPlainExplanations);
    setShowAdvancedTerms(RECOMMENDED_SETTINGS.showAdvancedTerms);
    setShowLearningTips(RECOMMENDED_SETTINGS.showLearningTips);
    setHideProIndicators(RECOMMENDED_SETTINGS.hideProIndicators);
    setDefaultTradingMode(RECOMMENDED_SETTINGS.defaultTradingMode);
    setDefaultMarket(RECOMMENDED_SETTINGS.defaultMarket);
    setDefaultTradeAmount(RECOMMENDED_SETTINGS.defaultTradeAmount);
    setDefaultTradeDuration(RECOMMENDED_SETTINGS.defaultTradeDuration);
    setConfirmPracticeTrades(RECOMMENDED_SETTINGS.confirmPracticeTrades);
    setRequireLiveTyping(RECOMMENDED_SETTINGS.requireLiveTyping);
    setPriceRefreshSpeed(RECOMMENDED_SETTINGS.priceRefreshSpeed);
    setShowMarketStatus(RECOMMENDED_SETTINGS.showMarketStatus);
    setShowAfterHoursWarning(RECOMMENDED_SETTINGS.showAfterHoursWarning);
    setShowDataDelayWarning(RECOMMENDED_SETTINGS.showDataDelayWarning);
    setTimezone(RECOMMENDED_SETTINGS.timezone);
    setSaveTradeHistory(RECOMMENDED_SETTINGS.saveTradeHistory);
    setSaveLearningProgress(RECOMMENDED_SETTINGS.saveLearningProgress);
    setUseHistoryForRecommendations(RECOMMENDED_SETTINGS.useHistoryForRecommendations);
    setLargerText(RECOMMENDED_SETTINGS.largerText);
    setHighContrast(RECOMMENDED_SETTINGS.highContrast);
    setReduceAnimations(RECOMMENDED_SETTINGS.reduceAnimations);
    setColorblindFriendly(RECOMMENDED_SETTINGS.colorblindFriendly);
    setAlwaysShowWordsWithColors(RECOMMENDED_SETTINGS.alwaysShowWordsWithColors);
    setNotifs(DEFAULT_NOTIFS);

    setShowResetConfirm(false);
    toast({
      title: "✅ Reset Complete",
      description: "All settings have been restored to recommended values.",
    });
  };

  // Reusable components inside page context for clean structure
  function Toggle({ checked, onChange, disabled = false }: { checked: boolean, onChange: (v: boolean) => void, disabled?: boolean }) {
    return (
      <button
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`toggle-switch ${checked ? "on" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        type="button"
      />
    );
  }

  function SegmentedControl<T extends string>({
    options,
    value,
    onChange
  }: {
    options: { value: T, label: string }[];
    value: T;
    onChange: (v: T) => void;
  }) {
    return (
      <div className="flex bg-[#050b14]/65 border border-slate-800 p-1 rounded-xl w-full">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-1.5 px-2 text-center rounded-lg text-[11px] font-black transition-all cursor-pointer ${
              value === opt.value
                ? "bg-[#2563eb] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="select-none text-left pb-16">
      <div className="max-w-none">
        
        {/* Page Header */}
        <div className="page-header select-none">
          <div>
            <h1 className="page-title text-32px font-extrabold text-white">Settings Center</h1>
            <p className="page-subtitle text-[15px] text-slate-400 mt-1">
              Customize your trading experience, alerts, appearance, and app preferences.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex flex-col gap-6">

          {/* ────────────────── ROW 1 ────────────────── */}
          <div className="settings-top-grid">

            {/* App Appearance Card */}
            <div className="account-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2 select-none">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-palette text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">App Appearance</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold mb-4 leading-relaxed">
                  Control how Trade Pro looks and feels.
                </p>

                <div className="flex flex-col gap-4">
                  {/* Theme Select */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider text-left">Theme</span>
                    <SegmentedControl
                      value={theme}
                      onChange={setTheme}
                      options={[
                        { value: "dark", label: "Dark Mode" },
                        { value: "light", label: "Light Mode" },
                        { value: "system", label: "System Default" },
                      ]}
                    />
                  </div>

                  {/* Accent Color Select */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider text-left">Accent Color</span>
                    <SegmentedControl
                      value={accentColor}
                      onChange={setAccentColor}
                      options={[
                        { value: "blue", label: "Blue" },
                        { value: "green", label: "Green" },
                        { value: "purple", label: "Purple" },
                        { value: "gold", label: "Gold" },
                      ]}
                    />
                  </div>

                  {/* Dashboard Density */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider text-left">Dashboard Density</span>
                    <SegmentedControl
                      value={density}
                      onChange={setDensity}
                      options={[
                        { value: "comfortable", label: "Comfortable" },
                        { value: "compact", label: "Compact" },
                        { value: "detailed", label: "Detailed" },
                      ]}
                    />
                  </div>

                  {/* Card Style */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider text-left">Card Style</span>
                    <SegmentedControl
                      value={cardStyle}
                      onChange={setCardStyle}
                      options={[
                        { value: "beginner", label: "Beginner Cards" },
                        { value: "pro", label: "Pro Trading" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Trading Experience Card */}
            <div className="account-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2 select-none">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-brain text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Trading Experience</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold mb-4 leading-relaxed">
                  Choose how simple or advanced the app should feel.
                </p>

                <div className="mb-4">
                  <SegmentedControl
                    value={experienceMode}
                    onChange={setExperienceMode}
                    options={[
                      { value: "beginner", label: "Beginner Mode" },
                      { value: "pro", label: "Pro Mode" },
                    ]}
                  />
                  <p className="text-[10px] text-slate-400 mt-2 font-bold bg-slate-950/45 p-2 rounded border border-slate-900 text-left">
                    {experienceMode === "beginner"
                      ? "💡 Beginner Mode explains trades in simple language."
                      : "⚡ Pro Mode shows more market data."}
                  </p>
                </div>

                <div className="flex flex-col gap-1 select-none">
                  {/* Explanations Toggle */}
                  <div className="protection-row">
                    <span className="text-slate-400">Show plain-language explanations:</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase ${showPlainExplanations ? "text-green-400" : "text-slate-500"}`}>
                        {showPlainExplanations ? "On" : "Off"}
                      </span>
                      <Toggle checked={showPlainExplanations} onChange={setShowPlainExplanations} />
                    </div>
                  </div>

                  {/* Advanced Terms Toggle */}
                  <div className="protection-row">
                    <span className="text-slate-400">Show advanced trading terms:</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase ${showAdvancedTerms ? "text-amber-500" : "text-slate-500"}`}>
                        {showAdvancedTerms ? "On" : "Off"}
                      </span>
                      <Toggle checked={showAdvancedTerms} onChange={setShowAdvancedTerms} />
                    </div>
                  </div>

                  {/* Learning Tips Toggle */}
                  <div className="protection-row">
                    <span className="text-slate-400">Show learning tips:</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase ${showLearningTips ? "text-green-400" : "text-slate-500"}`}>
                        {showLearningTips ? "On" : "Off"}
                      </span>
                      <Toggle checked={showLearningTips} onChange={setShowLearningTips} />
                    </div>
                  </div>

                  {/* Hide Pro Indicators Toggle */}
                  <div className="protection-row">
                    <span className="text-slate-400">Hide pro indicators unless expanded:</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase ${hideProIndicators ? "text-green-400" : "text-slate-500"}`}>
                        {hideProIndicators ? "On" : "Off"}
                      </span>
                      <Toggle checked={hideProIndicators} onChange={setHideProIndicators} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trade Defaults Card */}
            <div className="account-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2 select-none">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-sliders-h text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Trade Defaults</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold mb-4 leading-relaxed">
                  Choose what the app shows first when you start trading.
                </p>

                <div className="flex flex-col gap-4">
                  {/* Default Mode */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider text-left">Default Trading Mode</span>
                    <SegmentedControl
                      value={defaultTradingMode}
                      onChange={setDefaultTradingMode}
                      options={[
                        { value: "practice", label: "Practice Mode" },
                        { value: "live", label: "Live Mode" },
                      ]}
                    />
                  </div>

                  {/* Default Market */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider text-left">Default Market</span>
                    <SegmentedControl
                      value={defaultMarket}
                      onChange={setDefaultMarket}
                      options={[
                        { value: "forex", label: "Forex" },
                        { value: "stocks", label: "Stocks" },
                        { value: "crypto", label: "Crypto" },
                        { value: "options", label: "Options" },
                        { value: "commodities", label: "Commodities" },
                      ]}
                    />
                  </div>

                  {/* Default Trade Amount */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider text-left">Default Trade Amount</span>
                    <SegmentedControl
                      value={defaultTradeAmount}
                      onChange={setDefaultTradeAmount}
                      options={[
                        { value: "0.25", label: "$0.25" },
                        { value: "1", label: "$1" },
                        { value: "5", label: "$5" },
                        { value: "10", label: "$10" },
                        { value: "25", label: "$25" },
                      ]}
                    />
                  </div>

                  {/* Default Trade Duration */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider text-left">Default Trade Duration</span>
                    <SegmentedControl
                      value={defaultTradeDuration}
                      onChange={setDefaultTradeDuration}
                      options={[
                        { value: "quick", label: "Quick Trade" },
                        { value: "short", label: "Short-Term" },
                        { value: "long", label: "Long-Term" },
                      ]}
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-bold mt-4 text-left select-none">
                  ℹ️ Practice Mode is always the safest default. Live trades still require confirmation.
                </div>
              </div>
            </div>

          </div>

          {/* ────────────────── ROW 2 ────────────────── */}
          <div className="settings-middle-grid">

            {/* Trade Confirmation Card */}
            <div className="account-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2 select-none">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-circle-check text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Trade Confirmations</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold mb-4 leading-relaxed">
                  Control confirmation steps before trades are placed or closed.
                </p>

                <div className="flex flex-col gap-1 mt-2 select-none">
                  {/* Practice trade confirm */}
                  <div className="protection-row">
                    <span className="text-slate-400">Require confirmation before practice trades:</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase ${confirmPracticeTrades ? "text-green-400" : "text-slate-500"}`}>
                        {confirmPracticeTrades ? "On" : "Off"}
                      </span>
                      <Toggle checked={confirmPracticeTrades} onChange={setConfirmPracticeTrades} />
                    </div>
                  </div>

                  {/* Live trade confirm (Always On) */}
                  <div className="protection-row">
                    <span className="text-slate-400">Require confirmation before live trades:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-green-400">Always On</span>
                      <Toggle checked={true} onChange={() => {}} disabled={true} />
                    </div>
                  </div>

                  {/* Live close confirm (Always On) */}
                  <div className="protection-row">
                    <span className="text-slate-400">Require confirmation before closing live trades:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-green-400">Always On</span>
                      <Toggle checked={true} onChange={() => {}} disabled={true} />
                    </div>
                  </div>

                  {/* Live warning banner confirm (Always On) */}
                  <div className="protection-row">
                    <span className="text-slate-400">Show risk warning before live orders:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-green-400">Always On</span>
                      <Toggle checked={true} onChange={() => {}} disabled={true} />
                    </div>
                  </div>

                  {/* Typing confirmation */}
                  <div className="protection-row">
                    <span className="text-slate-400">Require typing LIVE for large live orders:</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase ${requireLiveTyping ? "text-green-400" : "text-slate-500"}`}>
                        {requireLiveTyping ? "On" : "Off"}
                      </span>
                      <Toggle checked={requireLiveTyping} onChange={setRequireLiveTyping} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-lg flex items-center gap-2.5 text-amber-400 select-none text-left">
                  <i className="fas fa-exclamation-triangle text-xs shrink-0"></i>
                  <span className="text-[10px] font-bold">Live trading confirmations cannot be fully disabled because live trades use real money.</span>
                </div>
              </div>
            </div>

            {/* Notifications Card */}
            <div className="account-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2 select-none">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-bell text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Notifications</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold mb-4 leading-relaxed">
                  Choose how you want to be alerted.
                </p>

                {/* 3 Notification Panels */}
                <div className="notification-panels select-none">

                  {/* Panel 1: Trade Alerts */}
                  <div className="notification-panel flex flex-col gap-2.5 text-left">
                    <span className="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-0.5">Trade Alerts</span>
                    {[
                      { key: "tradeOpened", label: "Trade opened" },
                      { key: "tradeClosed", label: "Trade closed" },
                      { key: "tradeWon", label: "Trade won" },
                      { key: "tradeLost", label: "Trade lost" },
                      { key: "stopLossHit", label: "Stop-loss hit" },
                      { key: "profitTargetReached", label: "Profit target reached" },
                    ].map(item => {
                      const rowStates = notifs[item.key as keyof typeof notifs];
                      return (
                        <div key={item.key} className="flex flex-col gap-1.5 py-1.5 border-b border-slate-900/60 last:border-0">
                          <span className="text-[10px] font-black text-white">{item.label}</span>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifs, "email")} className={`toggle-switch scale-75 shrink-0 ${rowStates.email ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">Email</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifs, "push")} className={`toggle-switch scale-75 shrink-0 ${rowStates.push ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">Push</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifs, "sms")} className={`toggle-switch scale-75 shrink-0 ${rowStates.sms ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">SMS</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Panel 2: Live Trading Alerts */}
                  <div className="notification-panel flex flex-col gap-2.5 text-left">
                    <span className="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-0.5">Live Alerts</span>
                    {[
                      { key: "liveOrderPlaced", label: "Live order placed" },
                      { key: "liveOrderFilled", label: "Live order filled" },
                      { key: "liveOrderRejected", label: "Live order rejected" },
                      { key: "brokerDisconnected", label: "Broker disconnected" },
                      { key: "buyingPowerLow", label: "Buying power low" },
                    ].map(item => {
                      const rowStates = notifs[item.key as keyof typeof notifs];
                      return (
                        <div key={item.key} className="flex flex-col gap-1.5 py-1.5 border-b border-slate-900/60 last:border-0">
                          <span className="text-[10px] font-black text-white">{item.label}</span>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifs, "email")} className={`toggle-switch scale-75 shrink-0 ${rowStates.email ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">Email</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifs, "push")} className={`toggle-switch scale-75 shrink-0 ${rowStates.push ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">Push</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifs, "sms")} className={`toggle-switch scale-75 shrink-0 ${rowStates.sms ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">SMS</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Panel 3: Learning Alerts */}
                  <div className="notification-panel flex flex-col gap-2.5 text-left">
                    <span className="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-0.5">Learning Alerts</span>
                    {[
                      { key: "dailySummary", label: "Daily summary" },
                      { key: "weeklyProgress", label: "Weekly progress" },
                      { key: "newLesson", label: "New lesson" },
                      { key: "riskReminder", label: "Risk reminder" },
                    ].map(item => {
                      const rowStates = notifs[item.key as keyof typeof notifs];
                      return (
                        <div key={item.key} className="flex flex-col gap-1.5 py-1.5 border-b border-slate-900/60 last:border-0">
                          <span className="text-[10px] font-black text-white">{item.label}</span>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifs, "email")} className={`toggle-switch scale-75 shrink-0 ${rowStates.email ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">Email</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifs, "push")} className={`toggle-switch scale-75 shrink-0 ${rowStates.push ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">Push</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifs, "sms")} className={`toggle-switch scale-75 shrink-0 ${rowStates.sms ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">SMS</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>
            </div>

          </div>

          {/* ────────────────── ROW 3 ────────────────── */}
          <div className="settings-bottom-grid">

            {/* Market Data Card */}
            <div className="account-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2 select-none">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-chart-line text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Market Data</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold mb-4 leading-relaxed">
                  Control how prices, market times, and data warnings appear.
                </p>

                <div className="flex flex-col gap-4 select-none">
                  {/* Price refresh speed */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider text-left">Price Refresh Speed</span>
                    <SegmentedControl
                      value={priceRefreshSpeed}
                      onChange={setPriceRefreshSpeed}
                      options={[
                        { value: "slow", label: "Slow" },
                        { value: "normal", label: "Normal" },
                        { value: "fast", label: "Fast" },
                      ]}
                    />
                  </div>

                  {/* Timezone */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider text-left">Preferred Time Zone</span>
                    <SegmentedControl
                      value={timezone}
                      onChange={setTimezone}
                      options={[
                        { value: "eastern", label: "Eastern Time" },
                        { value: "central", label: "Central Time" },
                        { value: "pacific", label: "Pacific Time" },
                        { value: "local", label: "Local Device" },
                      ]}
                    />
                  </div>

                  {/* Market warning toggles */}
                  <div className="flex flex-col gap-1">
                    <div className="protection-row">
                      <span className="text-slate-400">Show market status:</span>
                      <Toggle checked={showMarketStatus} onChange={setShowMarketStatus} />
                    </div>
                    <div className="protection-row">
                      <span className="text-slate-400">Show after-hours warning:</span>
                      <Toggle checked={showAfterHoursWarning} onChange={setShowAfterHoursWarning} />
                    </div>
                    <div className="protection-row">
                      <span className="text-slate-400">Show data delay warning:</span>
                      <Toggle checked={showDataDelayWarning} onChange={setShowDataDelayWarning} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data & Privacy Card */}
            <div className="account-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2 select-none">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-user-shield text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Data & Privacy</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold mb-4 leading-relaxed">
                  Control saved data and app history.
                </p>

                <div className="flex flex-col gap-1 select-none">
                  <div className="protection-row">
                    <span className="text-slate-400">Save trade history:</span>
                    <Toggle checked={saveTradeHistory} onChange={setSaveTradeHistory} />
                  </div>
                  <div className="protection-row">
                    <span className="text-slate-400">Save learning progress:</span>
                    <Toggle checked={saveLearningProgress} onChange={setSaveLearningProgress} />
                  </div>
                  <div className="protection-row">
                    <span className="text-slate-400">Use trade history to improve recommendations:</span>
                    <Toggle checked={useHistoryForRecommendations} onChange={setUseHistoryForRecommendations} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-5 select-none">
                <button
                  onClick={() => toast({ title: "Data Export Dispatching", description: "Your Trade Pro backup ZIP file is preparing." })}
                  className="h-10 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <i className="fas fa-file-download text-xs opacity-75"></i>
                  Export App Data
                </button>
                <button
                  onClick={() => toast({ title: "Cache Cleared", description: "Local layout cache has been wiped." })}
                  className="h-10 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <i className="fas fa-trash-alt text-xs opacity-75"></i>
                  Clear Local Cache
                </button>
                <button
                  onClick={() => toast({ title: "Preferences Cleared", description: "All local preferences have been cleared." })}
                  className="h-10 rounded-lg border border-red-500/30 hover:bg-red-500/5 text-red-400 text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <i className="fas fa-circle-xmark text-xs opacity-75"></i>
                  Delete Saved Preferences
                </button>
              </div>
            </div>

            {/* Accessibility Card */}
            <div className="account-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2 select-none">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-universal-access text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Accessibility</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold mb-4 leading-relaxed">
                  Make the app easier to read and use.
                </p>

                <div className="flex flex-col gap-1 select-none">
                  {/* Larger text */}
                  <div className="protection-row">
                    <span className="text-slate-400">Larger text:</span>
                    <Toggle checked={largerText} onChange={setLargerText} />
                  </div>
                  {/* High contrast */}
                  <div className="protection-row">
                    <span className="text-slate-400">High contrast mode:</span>
                    <Toggle checked={highContrast} onChange={setHighContrast} />
                  </div>
                  {/* Reduce animations */}
                  <div className="protection-row">
                    <span className="text-slate-400">Reduce animations:</span>
                    <Toggle checked={reduceAnimations} onChange={setReduceAnimations} />
                  </div>
                  {/* Colorblind friendly */}
                  <div className="protection-row">
                    <span className="text-slate-400">Color-blind friendly profit/loss labels:</span>
                    <Toggle checked={colorblindFriendly} onChange={setColorblindFriendly} />
                  </div>
                  {/* Words with colors */}
                  <div className="protection-row">
                    <span className="text-slate-400">Always show words with colors:</span>
                    <Toggle checked={alwaysShowWordsWithColors} onChange={setAlwaysShowWordsWithColors} />
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-bold mt-4 text-left select-none">
                  ℹ️ Status labels should always include words like Winning, Losing, Open, and Closed, not color alone.
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="settings-footer-actions select-none">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="h-[52px] px-6 rounded-xl border border-slate-700 hover:bg-slate-700/10 text-white text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <i className="fas fa-rotate text-xs opacity-75"></i>
            Reset to Recommended Settings
          </button>
          <button
            onClick={handleSave}
            className="h-[52px] px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(59,130,246,0.3)]"
          >
            <i className="fas fa-floppy-disk text-xs"></i>
            Save Settings
          </button>
        </div>

      </div>

      {/* Reset to Recommended Settings Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 border bg-[#0b1624] border-[#ef4444] text-left">
            <div className="text-base font-black text-red-500 mb-2 flex items-center gap-2">
              <i className="fas fa-exclamation-triangle"></i>
              Reset settings to defaults?
            </div>
            <div className="text-xs mb-5 text-slate-400 font-semibold leading-relaxed">
              This will restore all app preferences, themes, experience modes, trading default sizes, and custom notification alerts to recommended beginner-friendly settings.
            </div>
            <div className="flex gap-3 justify-end select-none">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all cursor-pointer"
              >
                Yes, Reset Settings
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
