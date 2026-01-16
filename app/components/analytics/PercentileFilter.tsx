'use client';

import React, { useState, useEffect } from 'react';

export interface PercentileRange {
  from: number;
  to: number;
  label?: string;
}

interface PercentileFilterProps {
  onFilterChange: (filter: PercentileRange | null) => void;
  currentFilter?: PercentileRange | null;
}

const PRESET_FILTERS: PercentileRange[] = [
  { from: 75, to: 100, label: 'Top 25%' },
  { from: 0, to: 25, label: 'Bottom 25%' },
  { from: 25, to: 75, label: 'Middle 50%' },
];

export default function PercentileFilter({ onFilterChange, currentFilter }: PercentileFilterProps) {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');

  useEffect(() => {
    if (currentFilter && !PRESET_FILTERS.find(preset => 
      preset.from === currentFilter.from && preset.to === currentFilter.to
    )) {
      setIsCustomMode(true);
      setCustomFrom(currentFilter.from.toString());
      setCustomTo(currentFilter.to.toString());
    }
  }, [currentFilter]);

  const handlePresetSelect = (preset: PercentileRange) => {
    setIsCustomMode(false);
    onFilterChange(preset);
  };

  const handleCustomApply = () => {
    const from = parseInt(customFrom);
    const to = parseInt(customTo);
    
    if (isNaN(from) || isNaN(to) || from < 0 || to > 100 || from >= to) {
      return;
    }
    
    onFilterChange({
      from,
      to,
      label: `${from}% - ${to}%`
    });
  };

  const handleReset = () => {
    setIsCustomMode(false);
    setCustomFrom('');
    setCustomTo('');
    onFilterChange(null);
  };

  const isCustomValid = () => {
    const from = parseInt(customFrom);
    const to = parseInt(customTo);
    return !isNaN(from) && !isNaN(to) && from >= 0 && to <= 100 && from < to;
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">Filter by Percentile Range</h4>
        {currentFilter && (
          <button
            onClick={handleReset}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Reset Filter
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESET_FILTERS.map((preset) => {
            const isActive = currentFilter && 
              currentFilter.from === preset.from && 
              currentFilter.to === preset.to;
            
            return (
              <button
                key={preset.label}
                onClick={() => handlePresetSelect(preset)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          <button
            onClick={() => setIsCustomMode(!isCustomMode)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              isCustomMode
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Custom Range
          </button>
        </div>

        {isCustomMode && (
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-600">From:</label>
              <input
                type="number"
                min="0"
                max="99"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="0"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-600">To:</label>
              <input
                type="number"
                min="1"
                max="100"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="100"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
            <button
              onClick={handleCustomApply}
              disabled={!isCustomValid()}
              className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        )}

        {currentFilter && (
          <div className="text-xs text-gray-600">
            <span className="font-medium">Active Filter:</span> {currentFilter.label}
          </div>
        )}
      </div>
    </div>
  );
}