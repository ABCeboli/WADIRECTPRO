
import React from 'react';

const QRIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor" 
      strokeWidth="1.8"
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M3 3h6v6H3V3zM15 3h6v6h-6V3zM3 15h6v6H3v-6z" />
      <path d="M21 21h-3v-3h3v3zM18 15h-3v3h3v-3zM21 15h-3" />
      <path d="M15 21v-3" />
      <path d="M12 3v18" />
      <path d="M3 12h18" />
    </svg>
  );
};

export default QRIcon;
