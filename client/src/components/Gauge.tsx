interface GaugeProps {
  value: string; // "Low", "Moderate", "High" or "Weak", "Neutral", "Strong"
  type?: "risk" | "momentum";
  size?: number;
  className?: string;
}

export default function Gauge({ 
  value, 
  type = "risk", 
  size = 100, 
  className = "" 
}: GaugeProps) {
  const getValueConfig = () => {
    if (type === "risk") {
      switch (value) {
        case "Low":
          return { color: "#10b981", position: 15, bgColor: "bg-emerald-500" }; // Green
        case "Moderate":
          return { color: "#f59e0b", position: 50, bgColor: "bg-amber-500" }; // Amber
        case "High":
          return { color: "#f43f5e", position: 85, bgColor: "bg-rose-500" }; // Red
        default:
          return { color: "#6b7280", position: 50, bgColor: "bg-gray-500" };
      }
    } else {
      switch (value) {
        case "Weak":
          return { color: "#f43f5e", position: 20, bgColor: "bg-rose-500" }; // Red
        case "Neutral":
          return { color: "#6b7280", position: 50, bgColor: "bg-gray-500" }; // Gray
        case "Strong":
          return { color: "#10b981", position: 80, bgColor: "bg-emerald-500" }; // Green
        default:
          return { color: "#6b7280", position: 50, bgColor: "bg-gray-500" };
      }
    }
  };

  const { color, position, bgColor } = getValueConfig();
  const radius = size / 2.5;

  // Calculate needle position (semi-circle from 180° to 0°)
  const angle = (180 - (position / 100 * 180)) * Math.PI / 180;
  const needleX = radius * Math.cos(angle);
  const needleY = radius * Math.sin(angle);

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`} data-testid="gauge">
      <svg width={size} height={size * 0.6} className="mb-2">
        {/* Background arc */}
        <path
          d={`M 10 ${size * 0.5} A ${radius} ${radius} 0 0 1 ${size - 10} ${size * 0.5}`}
          fill="none"
          stroke="rgb(55 65 81)"
          strokeWidth="6"
          className="opacity-20"
        />
        
        {/* Colored sections */}
        {type === "risk" ? (
          <>
            {/* Low risk - green */}
            <path
              d={`M 10 ${size * 0.5} A ${radius} ${radius} 0 0 1 ${size * 0.33} ${size * 0.35}`}
              fill="none"
              stroke="#10b981"
              strokeWidth="6"
              className="opacity-60"
            />
            {/* Moderate risk - amber */}
            <path
              d={`M ${size * 0.33} ${size * 0.35} A ${radius} ${radius} 0 0 1 ${size * 0.67} ${size * 0.35}`}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="6"
              className="opacity-60"
            />
            {/* High risk - red */}
            <path
              d={`M ${size * 0.67} ${size * 0.35} A ${radius} ${radius} 0 0 1 ${size - 10} ${size * 0.5}`}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="6"
              className="opacity-60"
            />
          </>
        ) : (
          <>
            {/* Weak - red */}
            <path
              d={`M 10 ${size * 0.5} A ${radius} ${radius} 0 0 1 ${size * 0.33} ${size * 0.35}`}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="6"
              className="opacity-60"
            />
            {/* Neutral - gray */}
            <path
              d={`M ${size * 0.33} ${size * 0.35} A ${radius} ${radius} 0 0 1 ${size * 0.67} ${size * 0.35}`}
              fill="none"
              stroke="#6b7280"
              strokeWidth="6"
              className="opacity-60"
            />
            {/* Strong - green */}
            <path
              d={`M ${size * 0.67} ${size * 0.35} A ${radius} ${radius} 0 0 1 ${size - 10} ${size * 0.5}`}
              fill="none"
              stroke="#10b981"
              strokeWidth="6"
              className="opacity-60"
            />
          </>
        )}
        
        {/* Needle */}
        <line
          x1={size / 2}
          y1={size * 0.5}
          x2={size / 2 + needleX}
          y2={size * 0.5 - needleY}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Center dot */}
        <circle
          cx={size / 2}
          cy={size * 0.5}
          r="4"
          fill={color}
        />
      </svg>
      
      {/* Value label */}
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${bgColor} mb-1`}></div>
        <span className="text-sm font-semibold text-white" data-testid="gauge-value">
          {value}
        </span>
        <span className="text-xs text-gray-400 capitalize" data-testid="gauge-type">
          {type}
        </span>
      </div>
    </div>
  );
}