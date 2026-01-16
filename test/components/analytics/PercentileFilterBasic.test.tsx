import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PercentileFilter, { PercentileRange } from '../../../app/components/analytics/PercentileFilter';

describe('PercentileFilter Basic Functionality', () => {
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    mockOnFilterChange.mockClear();
  });

  it('should render filter component with all preset buttons', () => {
    render(<PercentileFilter onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('Filter by Percentile Range')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Top 25%' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bottom 25%' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Middle 50%' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom Range' })).toBeInTheDocument();
  });

  it('should call onFilterChange when Top 25% preset is clicked', () => {
    render(<PercentileFilter onFilterChange={mockOnFilterChange} />);

    const top25Button = screen.getByRole('button', { name: 'Top 25%' });
    fireEvent.click(top25Button);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      from: 75,
      to: 100,
      label: 'Top 25%'
    });
  });

  it('should call onFilterChange when Bottom 25% preset is clicked', () => {
    render(<PercentileFilter onFilterChange={mockOnFilterChange} />);

    const bottom25Button = screen.getByRole('button', { name: 'Bottom 25%' });
    fireEvent.click(bottom25Button);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      from: 0,
      to: 25,
      label: 'Bottom 25%'
    });
  });

  it('should call onFilterChange when Middle 50% preset is clicked', () => {
    render(<PercentileFilter onFilterChange={mockOnFilterChange} />);

    const middle50Button = screen.getByRole('button', { name: 'Middle 50%' });
    fireEvent.click(middle50Button);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      from: 25,
      to: 75,
      label: 'Middle 50%'
    });
  });

  it('should show Reset Filter button when filter is active', () => {
    const currentFilter: PercentileRange = { from: 75, to: 100, label: 'Top 25%' };
    
    render(
      <PercentileFilter 
        onFilterChange={mockOnFilterChange} 
        currentFilter={currentFilter} 
      />
    );

    expect(screen.getByText('Reset Filter')).toBeInTheDocument();
    expect(screen.getByText('Active Filter:')).toBeInTheDocument();
  });

  it('should call onFilterChange with null when reset button is clicked', () => {
    const currentFilter: PercentileRange = { from: 75, to: 100, label: 'Top 25%' };
    
    render(
      <PercentileFilter 
        onFilterChange={mockOnFilterChange} 
        currentFilter={currentFilter} 
      />
    );

    const resetButton = screen.getByText('Reset Filter');
    fireEvent.click(resetButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith(null);
  });

  it('should highlight active preset filter', () => {
    const currentFilter: PercentileRange = { from: 75, to: 100, label: 'Top 25%' };
    
    render(
      <PercentileFilter 
        onFilterChange={mockOnFilterChange} 
        currentFilter={currentFilter} 
      />
    );

    const top25Button = screen.getByRole('button', { name: 'Top 25%' });
    expect(top25Button).toHaveClass('bg-blue-600', 'text-white');
  });

  it('should show custom range inputs when Custom Range is clicked', () => {
    render(<PercentileFilter onFilterChange={mockOnFilterChange} />);

    const customRangeButton = screen.getByRole('button', { name: 'Custom Range' });
    fireEvent.click(customRangeButton);

    expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('100')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('should handle custom range input', () => {
    render(<PercentileFilter onFilterChange={mockOnFilterChange} />);

    // Click custom range button
    const customRangeButton = screen.getByRole('button', { name: 'Custom Range' });
    fireEvent.click(customRangeButton);

    // Input custom values
    const fromInput = screen.getByPlaceholderText('0');
    const toInput = screen.getByPlaceholderText('100');
    fireEvent.change(fromInput, { target: { value: '30' } });
    fireEvent.change(toInput, { target: { value: '70' } });

    // Click apply
    const applyButton = screen.getByRole('button', { name: 'Apply' });
    fireEvent.click(applyButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      from: 30,
      to: 70,
      label: '30% - 70%'
    });
  });

  it('should disable Apply button for invalid custom range', () => {
    render(<PercentileFilter onFilterChange={mockOnFilterChange} />);

    const customRangeButton = screen.getByRole('button', { name: 'Custom Range' });
    fireEvent.click(customRangeButton);

    const fromInput = screen.getByPlaceholderText('0');
    const toInput = screen.getByPlaceholderText('100');
    
    // Set invalid range (from >= to)
    fireEvent.change(fromInput, { target: { value: '80' } });
    fireEvent.change(toInput, { target: { value: '20' } });

    const applyButton = screen.getByRole('button', { name: 'Apply' });
    expect(applyButton).toBeDisabled();
  });
});