import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PercentileFilter, { PercentileRange } from '../../../app/components/analytics/PercentileFilter';

describe('PercentileFilter Component', () => {
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    mockOnFilterChange.mockClear();
  });

  it('should render the filter component with preset buttons', () => {
    render(<PercentileFilter onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('Filter by Percentile Range')).toBeInTheDocument();
    expect(screen.getByText('Top 25%')).toBeInTheDocument();
    expect(screen.getByText('Bottom 25%')).toBeInTheDocument();
    expect(screen.getByText('Middle 50%')).toBeInTheDocument();
    expect(screen.getByText('Custom Range')).toBeInTheDocument();
  });

  it('should call onFilterChange when preset button is clicked', () => {
    render(<PercentileFilter onFilterChange={mockOnFilterChange} />);

    const top25Button = screen.getByText('Top 25%');
    fireEvent.click(top25Button);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      from: 75,
      to: 100,
      label: 'Top 25%'
    });
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

  it('should show Reset Filter button when filter is active', () => {
    const currentFilter: PercentileRange = { from: 0, to: 25, label: 'Bottom 25%' };
    
    render(
      <PercentileFilter 
        onFilterChange={mockOnFilterChange} 
        currentFilter={currentFilter} 
      />
    );

    expect(screen.getByText('Reset Filter')).toBeInTheDocument();
    expect(screen.getByText('Active Filter:')).toBeInTheDocument();
    // Check that there are multiple instances of "Bottom 25%" (button and label)
    const bottom25Elements = screen.getAllByText('Bottom 25%');
    expect(bottom25Elements).toHaveLength(2);
  });

  it('should call onFilterChange with null when reset button is clicked', () => {
    const currentFilter: PercentileRange = { from: 25, to: 75, label: 'Middle 50%' };
    
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

  it('should show custom range inputs when Custom Range is clicked', async () => {
    render(<PercentileFilter onFilterChange={mockOnFilterChange} />);

    const customRangeButton = screen.getByRole('button', { name: 'Custom Range' });
    fireEvent.click(customRangeButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('100')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    });
  });

  it('should handle custom range input and validation', async () => {
    render(<PercentileFilter onFilterChange={mockOnFilterChange} />);

    // Click custom range button
    const customRangeButton = screen.getByRole('button', { name: 'Custom Range' });
    fireEvent.click(customRangeButton);

    await waitFor(() => {
      const fromInput = screen.getByPlaceholderText('0');
      const toInput = screen.getByPlaceholderText('100');

      // Change values
      fireEvent.change(fromInput, { target: { value: '20' } });
      fireEvent.change(toInput, { target: { value: '80' } });

      // Click apply
      const applyButton = screen.getByRole('button', { name: 'Apply' });
      fireEvent.click(applyButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        from: 20,
        to: 80,
        label: '20% - 80%'
      });
    });
  });

  it('should disable Apply button for invalid custom range', async () => {
    render(<PercentileFilter onFilterChange={mockOnFilterChange} />);

    const customRangeButton = screen.getByRole('button', { name: 'Custom Range' });
    fireEvent.click(customRangeButton);

    await waitFor(() => {
      const fromInput = screen.getByPlaceholderText('0');
      const toInput = screen.getByPlaceholderText('100');

      // Set invalid range (from >= to)
      fireEvent.change(fromInput, { target: { value: '80' } });
      fireEvent.change(toInput, { target: { value: '20' } });

      const applyButton = screen.getByRole('button', { name: 'Apply' });
      expect(applyButton).toBeDisabled();
    });
  });

  it('should show custom filter in active state', () => {
    const customFilter: PercentileRange = { from: 30, to: 70, label: '30% - 70%' };
    
    render(
      <PercentileFilter 
        onFilterChange={mockOnFilterChange} 
        currentFilter={customFilter} 
      />
    );

    // Custom Range button should be active
    const customRangeButton = screen.getByRole('button', { name: 'Custom Range' });
    expect(customRangeButton).toHaveClass('bg-blue-600', 'text-white');
    
    // Should show active filter label
    expect(screen.getByText('Active Filter:')).toBeInTheDocument();
    expect(screen.getByText('30% - 70%')).toBeInTheDocument();
  });

  it('should pre-populate custom inputs when custom filter is active', async () => {
    const customFilter: PercentileRange = { from: 40, to: 60 };
    
    render(
      <PercentileFilter 
        onFilterChange={mockOnFilterChange} 
        currentFilter={customFilter} 
      />
    );

    // Custom range should be in custom mode initially with populated values
    await waitFor(() => {
      const fromInputs = screen.getAllByDisplayValue('40');
      const toInputs = screen.getAllByDisplayValue('60');
      expect(fromInputs.length).toBeGreaterThan(0);
      expect(toInputs.length).toBeGreaterThan(0);
    });
  });

  it('should handle edge cases for input validation', async () => {
    render(<PercentileFilter onFilterChange={mockOnFilterChange} />);

    const customRangeButton = screen.getByRole('button', { name: 'Custom Range' });
    fireEvent.click(customRangeButton);

    await waitFor(() => {
      const fromInput = screen.getByPlaceholderText('0');
      const toInput = screen.getByPlaceholderText('100');
      const applyButton = screen.getByRole('button', { name: 'Apply' });

      // Test boundary values
      fireEvent.change(fromInput, { target: { value: '0' } });
      fireEvent.change(toInput, { target: { value: '100' } });
      expect(applyButton).not.toBeDisabled();

      // Test invalid negative value
      fireEvent.change(fromInput, { target: { value: '-10' } });
      expect(applyButton).toBeDisabled();

      // Test invalid over 100 value
      fireEvent.change(fromInput, { target: { value: '0' } });
      fireEvent.change(toInput, { target: { value: '110' } });
      expect(applyButton).toBeDisabled();

      // Test equal values (should be invalid)
      fireEvent.change(toInput, { target: { value: '0' } });
      expect(applyButton).toBeDisabled();
    });
  });

  it('should handle multiple preset selections correctly', () => {
    render(<PercentileFilter onFilterChange={mockOnFilterChange} />);

    // Click Bottom 25%
    fireEvent.click(screen.getByText('Bottom 25%'));
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      from: 0,
      to: 25,
      label: 'Bottom 25%'
    });

    // Click Middle 50%
    fireEvent.click(screen.getByText('Middle 50%'));
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      from: 25,
      to: 75,
      label: 'Middle 50%'
    });

    expect(mockOnFilterChange).toHaveBeenCalledTimes(2);
  });
});