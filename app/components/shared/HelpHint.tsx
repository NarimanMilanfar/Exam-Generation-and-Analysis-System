"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface HelpHintProps {
  show: boolean;
  onDismiss: () => void;
  onStartTutorial: () => void;
  pageName: string;
  className?: string;
}

export default function HelpHint({ 
  show, 
  onDismiss, 
  onStartTutorial, 
  pageName,
  className = "" 
}: HelpHintProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Handle mounting to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let showTimer: NodeJS.Timeout;
    let hideTimer: NodeJS.Timeout;

    if (show) {
      setShouldRender(true);
      // Delay the animation to ensure the element is rendered
      showTimer = setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
      // Delay unmounting to allow exit animation
      hideTimer = setTimeout(() => setShouldRender(false), 300);
    }

    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [show]);

  const handleStartTutorial = () => {
    onDismiss();
    onStartTutorial();
  };

  if (!shouldRender) return null;

  const hintContent = (
    <div 
      className={`
        fixed bottom-6 left-6 max-w-sm z-50 transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        ${className}
      `}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-white font-semibold text-sm">New to this page?</h4>
            </div>
            <button
              onClick={onDismiss}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Dismiss hint"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 text-sm mb-4">
            Get familiar with the <strong>{pageName}</strong> page with our interactive tutorial.
          </p>
          
          <div className="flex items-center justify-between">
            <button
              onClick={onDismiss}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              No thanks
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 text-xs text-gray-400">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">?</kbd>
                <span>for help</span>
              </div>
              
              <button
                onClick={handleStartTutorial}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                Start Tutorial
              </button>
            </div>
          </div>
        </div>

        {/* Animated indicator */}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Pulse animation for attention */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-600/20 rounded-xl animate-pulse opacity-75 -z-10"></div>
    </div>
  );

  // Use portal to render hint at document body level to prevent hydration issues
  if (!isMounted || typeof window === 'undefined' || !document?.body) return null;
  
  return createPortal(hintContent, document.body);
} 