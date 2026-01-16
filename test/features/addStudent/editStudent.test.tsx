// test/features/editStudent/EditStudent.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditStudent from '../../../app/(features)/course/[id]/student/EditStudent';

const mockStudent = {
  id: 's1',
  name: 'Alice',
  studentId: '12345678',
};

const mockOnClose = jest.fn();
const mockOnStudentUpdated = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EditStudent Component', () => {
  it('renders student info correctly', () => {
    render(
      <EditStudent
        courseId="c1"
        student={mockStudent}
        enrollmentId="e1"
        onClose={mockOnClose}
        onStudentUpdated={mockOnStudentUpdated}
      />
    );

    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12345678')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(
      <EditStudent
        courseId="c1"
        student={mockStudent}
        enrollmentId="e1"
        onClose={mockOnClose}
        onStudentUpdated={mockOnStudentUpdated}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('submits updated student info', async () => {
    global.fetch = jest.fn((url, options) => {
      if (url === '/api/courses/c1/student/s1' && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            student: {
              id: 's1',
              name: 'Bob',
              studentId: '87654321',
            },
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as jest.Mock;

    render(
      <EditStudent
        courseId="c1"
        student={{ id: 's1', name: 'Alice', studentId: '12345678' }}
        enrollmentId="e1"
        onClose={mockOnClose}
        onStudentUpdated={mockOnStudentUpdated}
      />
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Bob' },
    });
    fireEvent.change(screen.getByLabelText(/student id/i), {
      target: { value: '87654321' },
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/courses/c1/student/s1',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    expect(mockOnStudentUpdated).toHaveBeenCalledWith({
      id: 's1',
      name: 'Bob',
      studentId: '87654321',
    });

    expect(mockOnClose).toHaveBeenCalled();
  });
});
