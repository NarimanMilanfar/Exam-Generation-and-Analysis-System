import React, { useState, useEffect } from "react";
import { X, Settings, Shuffle, Hash, CheckCircle } from "lucide-react";

interface VariantGenerationConfig {
  numberOfVariants: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  randomizeTrueFalse: boolean;
}

interface VariantGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (config: VariantGenerationConfig) => Promise<void>;
  examTitle: string;
  totalQuestions: number;
  initialConfig?: VariantGenerationConfig;
}

export const VariantGenerationModal: React.FC<VariantGenerationModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  examTitle,
  totalQuestions,
  initialConfig,
}) => {
  const defaultConfig: VariantGenerationConfig = {
    numberOfVariants: 3,
    randomizeQuestions: true,
    randomizeOptions: true,
    randomizeTrueFalse: true,
  };

  const [config, setConfig] = useState<VariantGenerationConfig>(
    initialConfig || defaultConfig
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);

  // Reset config when modal opens or initialConfig changes
  useEffect(() => {
    if (isOpen) {
      setConfig(initialConfig || defaultConfig);
      setIsGenerating(false);
      setIsComplete(false);
      setProgress(0);
    }
  }, [isOpen, initialConfig]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      await onGenerate(config);
      setProgress(100);
      setTimeout(() => {
        setIsComplete(true);
        clearInterval(progressInterval);
      }, 500);
    } catch (error) {
      setIsGenerating(false);
      setProgress(0);
      clearInterval(progressInterval);
    }
  };

  const handleViewExams = () => {
    setIsGenerating(false);
    setIsComplete(false);
    setProgress(0);
    onClose();
  };

  const handleClose = () => {
    if (!isGenerating) {
      setIsComplete(false);
      setProgress(0);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-navy/10 rounded-lg">
              <Settings className="w-5 h-5 text-brand-navy" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Generate Exam Variants
              </h3>
              <p className="text-sm text-gray-600">{examTitle}</p>
            </div>
          </div>
          {!isGenerating && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {!isGenerating && !isComplete ? (
            // Configuration Stage
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Configure how you want to generate exam variants. Each variant
                  will have different question and/or answer orders.
                </p>
              </div>

              {/* Number of Variants */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Variants
                </label>
                <select
                  value={config.numberOfVariants}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      numberOfVariants: parseInt(e.target.value),
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num}>
                      {num} variant{num !== 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Randomization Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Randomization Options
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.randomizeQuestions}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          randomizeQuestions: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                    />
                    <div className="flex items-center space-x-2">
                      <Shuffle className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">
                        Randomize Question Order
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.randomizeOptions}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          randomizeOptions: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                    />
                    <div className="flex items-center space-x-2">
                      <Hash className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">
                        Randomize Answer Options
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.randomizeTrueFalse}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          randomizeTrueFalse: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                    />
                    <div className="flex items-center space-x-2">
                      <Shuffle className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">
                        Randomize True/False Options
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Summary
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    • {config.numberOfVariants} exam variant
                    {config.numberOfVariants !== 1 ? "s" : ""}
                  </div>
                  <div>• {totalQuestions} questions per variant</div>
                  <div>
                    • Question order:{" "}
                    {config.randomizeQuestions ? "Randomized" : "Fixed"}
                  </div>
                  <div>
                    • Answer options:{" "}
                    {config.randomizeOptions ? "Randomized" : "Fixed"}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex-1 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 transition-colors font-medium"
                >
                  Start Generation
                </button>
              </div>
            </div>
          ) : isGenerating ? (
            // Loading Stage
            <div className="text-center py-8">
              <div className="mb-6">
                <div className="w-16 h-16 bg-brand-navy/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 border-4 border-brand-navy border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Generating Variants...
                </h4>
                <p className="text-sm text-gray-600">
                  Creating {config.numberOfVariants} unique exam variant
                  {config.numberOfVariants !== 1 ? "s" : ""} with your settings
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-brand-navy h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <div className="text-sm text-gray-500">
                {progress < 30 && "Analyzing questions..."}
                {progress >= 30 &&
                  progress < 60 &&
                  "Generating randomized variants..."}
                {progress >= 60 &&
                  progress < 90 &&
                  "Optimizing question orders..."}
                {progress >= 90 && "Finalizing variants..."}
              </div>
            </div>
          ) : (
            // Success Stage
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Done!
              </h4>
              <p className="text-sm text-gray-600 mb-6">
                Successfully generated {config.numberOfVariants} exam variant
                {config.numberOfVariants !== 1 ? "s" : ""}. Your exam is ready
                for distribution and analytics tracking.
              </p>

              <button
                onClick={handleViewExams}
                className="w-full px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 transition-colors font-medium"
              >
                View Exams
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VariantGenerationModal;
