import React, { createContext, useContext, useState, ReactNode } from "react";

interface ExamContextType {
  showAnswers: boolean;
  setShowAnswers: (show: boolean) => void;
  toggleShowAnswers: () => void;
  seed?: string;
  setSeed: (seed: string) => void;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

/**
 * Custom hook to access the exam context
 * 
 * Provides access to exam state including answer visibility and randomization seed.
 * Must be used within an ExamProvider component.
 * 
 * @throws {Error} When used outside of an ExamProvider
 * @returns {ExamContextType} The exam context containing state and setter functions
 * 
 * @example
 * ```tsx
 * const { showAnswers, toggleShowAnswers, seed, setSeed } = useExamContext();
 * ```
 */
export const useExamContext = () => {
  const context = useContext(ExamContext);
  if (context === undefined) {
    throw new Error("useExamContext must be used within an ExamProvider");
  }
  return context;
};

interface ExamProviderProps {
  children: ReactNode;
  initialShowAnswers?: boolean;
  initialSeed?: string;
}

/**
 * ExamProvider - Context provider for exam display state management
 * 
 * Manages global state for exam display including answer visibility and randomization seed.
 * Wraps child components to provide access to exam context through useExamContext hook.
 * 
 * @param props - The component props
 * @param props.children - Child components that need access to exam context
 * @param props.initialShowAnswers - Initial state for answer visibility (default: false)
 * @param props.initialSeed - Initial seed for randomization (default: "")
 * 
 * @example
 * ```tsx
 * <ExamProvider initialShowAnswers={false} initialSeed="exam-123">
 *   <ExamDisplay />
 *   <AnswerToggle />
 * </ExamProvider>
 * ```
 */
export const ExamProvider: React.FC<ExamProviderProps> = ({ 
  children, 
  initialShowAnswers = false,
  initialSeed = ""
}) => {
  const [showAnswers, setShowAnswers] = useState(initialShowAnswers);
  const [seed, setSeed] = useState(initialSeed);

  const toggleShowAnswers = () => setShowAnswers(!showAnswers);

  return (
    <ExamContext.Provider value={{ showAnswers, setShowAnswers, toggleShowAnswers, seed, setSeed }}>
      {children}
    </ExamContext.Provider>
  );
}; 