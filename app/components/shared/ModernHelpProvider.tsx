"use client";

import { useState, useEffect } from "react";
import { usePageTutorial } from "../../hooks/usePageTutorial";
import HelpButton from "./HelpButton";
import HelpHint from "./HelpHint";
import TutorialModal from "../onboarding/TutorialModal";

interface ModernHelpProviderProps {
  children: React.ReactNode;
  showFloatingHelp?: boolean;
  showHelpHints?: boolean;
  className?: string;
}

export default function ModernHelpProvider({
  children,
  showFloatingHelp = false,
  showHelpHints = true,
  className = ""
}: ModernHelpProviderProps) {
  const [isMounted, setIsMounted] = useState(false);
  const {
    currentPageTutorial,
    showTutorial,
    startTutorial,
    closeTutorial,
    pageName,
    showHelpHint,
    dismissHelpHint,
  } = usePageTutorial();

  // Handle hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Global keyboard shortcut for help (? key) - centralized to prevent duplicates
  useEffect(() => {
    if (!isMounted) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not in an input/textarea and tutorial is available
      if (
        e.key === '?' && 
        !showTutorial &&
        currentPageTutorial &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        startTutorial();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showTutorial, currentPageTutorial, startTutorial, isMounted]);

  return (
    <div className={`relative ${className}`}>
      {children}
      
      {/* Only render client-specific components after mount to prevent hydration errors */}
      {isMounted && (
        <>
          {/* Floating Help Button */}
          {showFloatingHelp && currentPageTutorial && (
            <HelpButton
              key="floating-help"
              variant="floating"
              showPulse={showHelpHint}
              className="transition-all duration-500"
            />
          )}
          
          {/* Help Hints for New Users */}
          {showHelpHints && (
            <HelpHint
              key="help-hint"
              show={showHelpHint}
              onDismiss={dismissHelpHint}
              onStartTutorial={startTutorial}
              pageName={pageName}
            />
          )}
          
          {/* Tutorial Modal */}
          {showTutorial && currentPageTutorial && (
            <TutorialModal
              key="tutorial-modal"
              isOpen={showTutorial}
              tutorial={currentPageTutorial}
              pageName={pageName}
              onClose={closeTutorial}
            />
          )}
        </>
      )}
    </div>
  );
} 