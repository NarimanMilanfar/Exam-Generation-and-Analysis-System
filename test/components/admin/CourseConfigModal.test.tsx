import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CourseConfigModal from '../../../app/(features)/admin/components/CourseConfigModal';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('react-hot-toast');
const mockToast = toast as jest.Mocked<typeof toast>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('CourseConfigModal', () => {
  const mockCourse = {
    id: 'course-1',
    name: 'Test Course',
    description: 'Test Description',
    color: '#10b981',
    section: '001',
  };

  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('should not render when not open', () => {
    render(
      <CourseConfigModal
        isOpen={false}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText('Course Configuration')).not.toBeInTheDocument();
  });

  it('should render with course information when open', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        config: {
          defaultQuestionCount: 25,
          defaultFormat: 'MCQ',
          weightPerQuestion: 1.5,
          negativeMarking: true,
          allowInstructorOverride: false,
        },
      }),
    } as Response);

    render(
      <CourseConfigModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Course Configuration')).toBeInTheDocument();
    expect(screen.getByText('Test Course')).toBeInTheDocument();
    expect(screen.getByText('(Section 001)')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/courses/course-1/config');
    });
  });

  it('should load existing config on mount', async () => {
    const mockConfig = {
      defaultQuestionCount: 25,
      defaultFormat: 'TrueFalse',
      weightPerQuestion: 1.5,
      negativeMarking: true,
      allowInstructorOverride: false,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        config: mockConfig,
      }),
    } as Response);

    render(
      <CourseConfigModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('25')).toBeInTheDocument();
      expect(screen.getByDisplayValue('True/False')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1.5')).toBeInTheDocument();
      expect(screen.getByLabelText('Enabled')).toBeChecked();
      expect(screen.getByLabelText('Allow instructors to override these defaults for individual exams')).not.toBeChecked();
    });
  });

  it('should use default config when none exists (404)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    render(
      <CourseConfigModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('20')).toBeInTheDocument(); // default question count
      expect(screen.getByDisplayValue('Multiple Choice Questions (MCQ)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // default weight
      expect(screen.getByLabelText('Disabled')).toBeChecked(); // default negative marking
      expect(screen.getByLabelText('Allow instructors to override these defaults for individual exams')).toBeChecked(); // default override
    });
  });

  it('should update form values when changed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        config: {
          defaultQuestionCount: 20,
          defaultFormat: 'MCQ',
          weightPerQuestion: 1.0,
          negativeMarking: false,
          allowInstructorOverride: true,
        },
      }),
    } as Response);

    render(
      <CourseConfigModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    });

    // Change question count
    const questionCountInput = screen.getByLabelText('Default Number of Questions');
    fireEvent.change(questionCountInput, { target: { value: '30' } });
    expect(questionCountInput).toHaveValue(30);

    // Change format
    const formatSelect = screen.getByLabelText('Default Format');
    fireEvent.change(formatSelect, { target: { value: 'Mixed' } });
    expect(formatSelect).toHaveValue('Mixed');

    // Change weight
    const weightInput = screen.getByLabelText('Weight per Question');
    fireEvent.change(weightInput, { target: { value: '2.0' } });
    expect(weightInput).toHaveValue(2.0);

    // Change negative marking
    const negativeMarkingEnabled = screen.getByLabelText('Enabled');
    fireEvent.click(negativeMarkingEnabled);
    expect(negativeMarkingEnabled).toBeChecked();

    // Change instructor override
    const instructorOverride = screen.getByLabelText('Allow instructors to override these defaults for individual exams');
    fireEvent.click(instructorOverride);
    expect(instructorOverride).not.toBeChecked();
  });

  it('should save config successfully', async () => {
    // Mock initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        config: {
          defaultQuestionCount: 20,
          defaultFormat: 'MCQ',
          weightPerQuestion: 1.0,
          negativeMarking: false,
          allowInstructorOverride: true,
        },
      }),
    } as Response);

    // Mock save fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        config: {},
      }),
    } as Response);

    render(
      <CourseConfigModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    });

    // Submit form
    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/courses/course-1/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          defaultQuestionCount: 20,
          defaultFormat: 'MCQ',
          weightPerQuestion: 1.0,
          negativeMarking: false,
          allowInstructorOverride: true,
        }),
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith('Course configuration saved successfully!');
    expect(mockOnSave).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle save errors', async () => {
    // Mock initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        config: {
          defaultQuestionCount: 20,
          defaultFormat: 'MCQ',
          weightPerQuestion: 1.0,
          negativeMarking: false,
          allowInstructorOverride: true,
        },
      }),
    } as Response);

    // Mock failed save fetch
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Validation error',
      }),
    } as Response);

    render(
      <CourseConfigModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    });

    // Submit form
    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Validation error');
    });

    expect(mockOnSave).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should close modal when cancel is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        config: {
          defaultQuestionCount: 20,
          defaultFormat: 'MCQ',
          weightPerQuestion: 1.0,
          negativeMarking: false,
          allowInstructorOverride: true,
        },
      }),
    } as Response);

    render(
      <CourseConfigModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal when X button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        config: {
          defaultQuestionCount: 20,
          defaultFormat: 'MCQ',
          weightPerQuestion: 1.0,
          negativeMarking: false,
          allowInstructorOverride: true,
        },
      }),
    } as Response);

    render(
      <CourseConfigModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Course Configuration')).toBeInTheDocument();
    });

    // Find the X button in the header - it's the button with SVG content
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(button => button.querySelector('svg'));
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    expect(mockOnClose).toHaveBeenCalled();
  });
});