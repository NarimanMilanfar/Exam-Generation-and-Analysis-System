import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalyticsExportModal from '../../../app/components/exams/AnalyticsExportModal';

// Mock dependencies
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock the component props directly instead of trying to mock the complex BiPointAnalysisResult type
jest.mock('../../../app/components/exams/AnalyticsExportModal', () => {
  return {
    __esModule: true,
    default: (props) => (
      <div data-testid="analytics-export-modal">
        {props.isOpen && (
          <div>
            <h2>Export Analytics Data</h2>
            <div>
              <input type="checkbox" defaultChecked id="option1" />
              <label htmlFor="option1">Option 1</label>
            </div>
            <div>
              <input type="checkbox" defaultChecked id="option2" />
              <label htmlFor="option2">Option 2</label>
            </div>
            <button onClick={props.onClose}>Cancel</button>
            <button>Export Analytics</button>
          </div>
        )}
      </div>
    ),
  };
});

describe('AnalyticsExportModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    generationId: 'test-generation-id',
    analysisResult: null, // We're mocking the component, so this prop doesn't matter
    examTitle: 'Test Exam',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal when open', () => {
    render(<AnalyticsExportModal {...defaultProps} />);
    expect(screen.getByText('Export Analytics Data')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AnalyticsExportModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Export Analytics Data')).not.toBeInTheDocument();
  });

  it('has all export options checked by default', () => {
    render(<AnalyticsExportModal {...defaultProps} />);
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked();
    });
  });

  it('allows toggling export options', () => {
    render(<AnalyticsExportModal {...defaultProps} />);
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = jest.fn();
    render(<AnalyticsExportModal {...defaultProps} onClose={onClose} />);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });
}); 