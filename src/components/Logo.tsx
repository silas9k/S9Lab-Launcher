import logo from "../assets/logo.png";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <img src={logo} alt="S9Lab" className="brand__icon" />
      {!compact && (
        <div>
          <strong>S9Lab</strong>
          <span>Launcher</span>
        </div>
      )}
    </div>
  );
}
