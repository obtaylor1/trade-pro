import { Home, Zap, Newspaper, GraduationCap } from "lucide-react";
import { useLocation } from "wouter";

interface NavigationItem {
  id: string;
  label: string;
  icon: any;
  path: string;
}

interface BottomNavigationProps {
  onNavigate?: (path: string) => void;
  className?: string;
}

export default function BottomNavigation({ onNavigate, className = "" }: BottomNavigationProps) {
  const [location, setLocation] = useLocation();

  const navigationItems: NavigationItem[] = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    { id: "ai-signal", label: "AI Signal", icon: Zap, path: "/ai-suggestion" },
    { id: "news", label: "News", icon: Newspaper, path: "/news" },
    { id: "learn", label: "Learn", icon: GraduationCap, path: "/learn-options" }
  ];

  const handleNavigate = (path: string) => {
    setLocation(path);
    onNavigate?.(path);
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 ${className}`} data-testid="bottom-navigation">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'text-blue-600' 
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid={`nav-${item.id}`}
              >
                <Icon className={`h-6 w-6 mb-1 ${isActive ? 'text-blue-600' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}