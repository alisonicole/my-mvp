import React from 'react';

export function Logo() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '24px' 
    }}>
      {/* Logo Icon - Connecting the Dots */}
      <div style={{ position: 'relative' }}>
        <svg
          width="160"
          height="120"
          viewBox="0 0 160 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1))' }}
        >
          {/* Connecting lines - the journey between dots */}
          <path
            d="M 40 80 Q 60 65, 80 50 Q 100 35, 120 20"
            stroke="#C084FC"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="4 6"
            opacity="0.6"
          />
          
          {/* Main dots to connect */}
          <circle cx="40" cy="80" r="8" fill="#9333EA" opacity="0.9" />
          <circle cx="80" cy="50" r="8" fill="#A855F7" />
          <circle cx="120" cy="20" r="8" fill="#9333EA" opacity="0.9" />
          
          {/* Smaller dots in between - the insights */}
          <circle cx="60" cy="65" r="4" fill="#DDD6FE" />
          <circle cx="100" cy="35" r="4" fill="#DDD6FE" />
          
          {/* Glow effect on main dots */}
          <circle cx="40" cy="80" r="12" fill="#C084FC" opacity="0.2" />
          <circle cx="80" cy="50" r="12" fill="#C084FC" opacity="0.3" />
          <circle cx="120" cy="20" r="12" fill="#C084FC" opacity="0.2" />
        </svg>
      </div>
      
      {/* Logo Text */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '48px', 
          fontWeight: '300', 
          color: '#581c87', 
          letterSpacing: '0.05em',
          margin: 0,
          fontFamily: "'Crimson Pro', serif"
        }}>
          between
        </h1>
      </div>
    </div>
  );
}

export default Logo;