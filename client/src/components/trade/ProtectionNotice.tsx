export default function ProtectionNotice() {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold text-green-400"
      style={{
        background: "rgba(34, 197, 94, 0.08)",
        borderColor: "rgba(34, 197, 94, 0.2)",
      }}
    >
      <i className="fas fa-shield-alt text-base"></i>
      <span>We only show trades that fit your amount. Your practice money is always protected.</span>
    </div>
  );
}
