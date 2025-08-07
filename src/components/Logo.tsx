interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
  className?: string;
}

export function Logo({ size = 'md', variant = 'light', className = "" }: LogoProps) {
  const sizeClasses = {
    sm: { text: 'text-lg', icon: 'w-5 h-5' },
    md: { text: 'text-2xl', icon: 'w-7 h-7' },
    lg: { text: 'text-3xl', icon: 'w-10 h-10' },
    xl: { text: 'text-4xl', icon: 'w-12 h-12' }
  };

  const colorClasses = {
    light: 'text-white',
    dark: 'text-gray-800'
  };

  const leafColor = variant === 'light' ? '#ffffff' : '#84cc7e';

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative">
        {/* Leaf Icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke={leafColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={sizeClasses[size].icon}
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
        {/* Small accent dot */}
        <div 
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: variant === 'light' ? '#ffffff' : '#84cc7e' }}
        ></div>
      </div>
      
      <div className="flex flex-col">
        <span 
          className={`font-bold leading-tight ${sizeClasses[size].text} ${colorClasses[variant]}`}
          style={{ 
            textShadow: variant === 'light' ? '0 2px 4px rgba(0,0,0,0.3)' : 'none',
            filter: variant === 'light' ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' : 'none'
          }}
        >
          Sense<span 
            style={{ 
              color: variant === 'light' ? '#ffffff' : '#84cc7e',
              textShadow: variant === 'light' ? '0 2px 4px rgba(0,0,0,0.4)' : 'none'
            }}
          >Guardian</span>
        </span>
        {size === 'lg' || size === 'xl' ? (
          <span 
            className={`text-xs ${variant === 'light' ? 'text-white/80' : 'text-gray-600'} tracking-wider uppercase`}
            style={{ 
              textShadow: variant === 'light' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
            }}
          >
            Sensor Monitoring
          </span>
        ) : null}
      </div>
    </div>
  );
}