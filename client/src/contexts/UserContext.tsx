import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  startingCapital: number;
  currentBalance: number;
  selectedBroker: string;
  isLiveTrading: boolean;
}

interface UserContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  loginError: string | null;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  updateUserFromRegistration: (userData: User) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('trading-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('trading-user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const responseData = await response.json();

      if (response.status === 404) {
        setLoginError('No account found with that email. Please create an account first.');
        return false;
      }

      if (!response.ok) {
        setLoginError(responseData.message || 'Login failed. Please try again.');
        return false;
      }

      const userData: User = {
        id: responseData.id,
        name: responseData.name,
        email: responseData.email,
        startingCapital: responseData.startingCapital,
        currentBalance: responseData.currentBalance,
        selectedBroker: responseData.selectedBroker,
        isLiveTrading: responseData.isLiveTrading,
      };

      setUser(userData);
      localStorage.setItem('trading-user', JSON.stringify(userData));
      return true;
    } catch {
      setLoginError('Network error. Please check your connection and try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setLoginError(null);
    localStorage.removeItem('trading-user');
  };

  const updateUserFromRegistration = (userData: User) => {
    setUser(userData);
    localStorage.setItem('trading-user', JSON.stringify(userData));
  };

  const value = {
    user,
    isLoggedIn: !!user,
    isLoading,
    loginError,
    login,
    logout,
    updateUserFromRegistration,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
