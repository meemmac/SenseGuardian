import { Logo } from "./Logo";

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #a8e6cf 0%, #84cc7e 25%, #7fb8d6 50%, #d4a5c7 75%, #f2c2a7 100%)'
    }}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-20 h-20 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}></div>
        <div className="absolute top-32 right-16 w-12 h-12 rounded-full" style={{ backgroundColor: 'rgba(168, 230, 207, 0.25)' }}></div>
        <div className="absolute bottom-20 left-20 w-16 h-16 rounded-full" style={{ backgroundColor: 'rgba(127, 184, 214, 0.2)' }}></div>
        <div className="absolute bottom-32 right-12 w-8 h-8 rounded-full" style={{ backgroundColor: 'rgba(212, 165, 199, 0.3)' }}></div>
        <div className="absolute top-1/2 left-1/4 w-6 h-6 rounded-full" style={{ backgroundColor: 'rgba(242, 194, 167, 0.25)' }}></div>
        <div className="absolute top-1/3 right-1/3 w-10 h-10 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}></div>
        <div className="absolute top-3/4 left-1/2 w-14 h-14 rounded-full" style={{ backgroundColor: 'rgba(132, 204, 126, 0.15)' }}></div>
        <div className="absolute top-1/4 left-3/4 w-4 h-4 rounded-full" style={{ backgroundColor: 'rgba(168, 230, 207, 0.3)' }}></div>
      </div>

      {/* Logo and branding */}
      <div className="text-center z-10">
        <div className="mb-6 flex justify-center p-6 rounded-2xl" style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <Logo size="xl" variant="light" className="animate-pulse" />
        </div>

        {/* Loading animation - better aligned */}
        <div className="flex flex-col items-center mt-6">
          <div className="flex space-x-2 mb-3">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p 
            className="text-white text-sm"
            style={{ 
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            Initializing sensors...
          </p>
        </div>
      </div>

      {/* Auto complete loading after 3 seconds */}
      <div className="absolute inset-0" onClick={() => setTimeout(onLoadingComplete, 3000)}></div>
    </div>
  );
}