interface RadialProgressProps {
  value: number; // 0-100
  size?: number; // diameter in pixels
  strokeWidth?: number;
  className?: string;
  label?: string;
  showValue?: boolean;
}

export default function RadialProgress({ 
  value, 
  size = 120, 
  strokeWidth = 8, 
  className = "",
  label = "Progress",
  showValue = true 
}: RadialProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`} data-testid="radial-progress">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgb(55 65 81)" // gray-700
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#3b82f6" // Electric blue
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <span className="text-2xl font-bold text-white" data-testid="progress-value">
            {Math.round(value)}%
          </span>
        )}
        {label && (
          <span className="text-xs text-gray-400 mt-1" data-testid="progress-label">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}