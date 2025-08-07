import { useState, useEffect } from "react";
import { LoadingScreen } from "./components/LoadingScreen";
import { Dashboard } from "./components/Dashboard";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Auto-complete loading after 3 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  if (isLoading) {
    return <LoadingScreen onLoadingComplete={handleLoadingComplete} />;
  }

  return <Dashboard />;
}