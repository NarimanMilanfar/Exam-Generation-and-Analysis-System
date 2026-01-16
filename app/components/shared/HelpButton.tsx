"use client";

import Image from "next/image";
import { useState } from "react";
import { usePageTutorial } from "../../hooks/usePageTutorial";

interface HelpButtonProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "button" | "floating";
  showPulse?: boolean;
  tooltip?: boolean;
}

export default function HelpButton({ 
  className = "", 
  size = "md", 
  variant = "icon",
  showPulse = false,
  tooltip = true
}: HelpButtonProps) {
  const { currentPageTutorial, startTutorial, pageName } = usePageTutorial();
  const [isHovered, setIsHovered] = useState(false);

  if (!currentPageTutorial) {
    return null; // Don't render if no tutorial available
  }

  const sizeClasses = {
    sm: "w-8 h-8 p-1.5",
    md: "w-10 h-10 p-2",
    lg: "w-12 h-12 p-2.5"
  };

  const iconSizes = {
    sm: { width: 18, height: 18 },
    md: { width: 24, height: 24 },
    lg: { width: 28, height: 28 }
  };

  const baseClasses = "relative group transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-blue-500/20";
  
  if (variant === "floating") {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={startTutorial}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`
            ${baseClasses}
            w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 
            hover:from-blue-600 hover:to-indigo-700 
            text-white rounded-full shadow-xl hover:shadow-2xl
            transform hover:scale-110 active:scale-95 transition-transform duration-200
            ${showPulse ? 'animate-pulse' : ''}
            ${className}
          `}
          aria-label={`Get help with ${pageName}`}
          title={tooltip ? `Get help with ${pageName}` : undefined}
        >
          {/* Ripple effect */}
          <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300" />
          
          {/* Icon */}
          <div className="relative flex items-center justify-center w-full h-full">
            <svg 
              className={`w-7 h-7 transition-transform duration-300 ${isHovered ? 'rotate-12' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          {/* Tooltip */}
          {tooltip && (
            <div className={`
              absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm 
              rounded-lg shadow-lg transition-all duration-200 whitespace-nowrap
              ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}
            `}>
              Help with {pageName}
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            </div>
          )}
        </button>
      </div>
    );
  }

  if (variant === "icon") {
    return (
      <button
        onClick={startTutorial}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          ${baseClasses} ${sizeClasses[size]}
          bg-gradient-to-r from-blue-50 to-indigo-50 
          hover:from-blue-100 hover:to-indigo-100
          border border-blue-200 hover:border-blue-300
          text-blue-600 hover:text-blue-700 rounded-xl 
          shadow-sm hover:shadow-md
          flex items-center justify-center
          transform hover:scale-105 active:scale-95
          ${className}
        `}
        aria-label={`Get help with ${pageName}`}
        title={tooltip ? `Get help with ${pageName}` : undefined}
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/10 to-indigo-400/10 scale-0 group-hover:scale-100 transition-transform duration-300" />
        
        {/* Icon */}
        <div className="relative">
          <svg 
            className={`transition-all duration-300 ${isHovered ? 'rotate-12 scale-110' : ''}`}
            width={iconSizes[size].width}
            height={iconSizes[size].height}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={startTutorial}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        ${baseClasses}
        inline-flex items-center space-x-3 px-4 py-2.5
        bg-gradient-to-r from-blue-50 to-indigo-50 
        hover:from-blue-100 hover:to-indigo-100
        border border-blue-200 hover:border-blue-300
        text-blue-700 hover:text-blue-800 rounded-xl 
        shadow-sm hover:shadow-md
        text-sm font-medium
        transform hover:scale-105 active:scale-95
        ${className}
      `}
      aria-label={`Get help with ${pageName}`}
      title={tooltip ? `Get help with ${pageName}` : undefined}
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/10 to-indigo-400/10 scale-0 group-hover:scale-100 transition-transform duration-300" />
      
      {/* Icon and text */}
      <div className="relative flex items-center space-x-3">
        <svg 
          className={`w-5 h-5 transition-all duration-300 ${isHovered ? 'rotate-12' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className={`transition-all duration-300 ${isHovered ? 'translate-x-0.5' : ''}`}>
          Help
        </span>
      </div>
    </button>
  );
} 