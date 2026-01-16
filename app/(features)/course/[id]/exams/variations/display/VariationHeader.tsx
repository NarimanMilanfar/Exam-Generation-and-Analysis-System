import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";

interface ExamHeaderProps {
  title: string;
  courseName?: string;
  version: number;
  onHeightChange?: (height: number) => void;
}

export interface ExamHeaderRef {
  getHeight: () => number;
  measureHeight: () => void;
}

/**
 * ExamHeader - Header component for exam pages
 * 
 * Displays exam title, course name, and version number with height measurement capabilities.
 * 
 * @param props - The component props
 * @param ref - Forwarded ref providing access to height measurement methods
 * 
 * @example
 * ```tsx
 * <ExamHeader
 *   title="Final Exam"
 *   courseName="Mathematics 101"
 *   version={1}
 *   onHeightChange={(height) => console.log(height)}
 * />
 * ```
 */
const ExamHeader = forwardRef<ExamHeaderRef, ExamHeaderProps>(
  ({ title, courseName, version, onHeightChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    /**
     * Measures the current height of the header and triggers onHeightChange callback
     * @returns The measured height in pixels
     */
    const measureHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.offsetHeight + 10;
        onHeightChange?.(height);
        return height;
      }
      return 0;
    };

    useImperativeHandle(ref, () => ({
      getHeight: () => {
        if (containerRef.current) {
          return containerRef.current.offsetHeight + 10;
        }
        return 0;
      },
      measureHeight
    }));

    // Measure height when component mounts or when content changes
    useEffect(() => {
      // Use a small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        measureHeight();
      }, 0);

      return () => clearTimeout(timer);
    }, []);

    return (
      <div className="text-center mb-8 border-b pb-4" ref={containerRef} data-testid="exam-header">
        <h1 className="text-exam-title" data-testid="exam-title">{title}</h1>
        {courseName && (
          <div 
            className="text-course-name mt-2 text-sm text-gray-600 max-w-2xl mx-auto text-left" 
            data-testid="course-name"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {courseName}
          </div>
        )}
        <p className="text-version mt-1" data-testid="version">
          Version {version}
        </p>
      </div>
    );
  }
);

ExamHeader.displayName = "ExamHeader";

export default ExamHeader; 