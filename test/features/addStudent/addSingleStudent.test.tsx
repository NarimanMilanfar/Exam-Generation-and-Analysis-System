import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AddStudentModal } from '../../../app/(features)/course/[id]/student/addSingleStudent'

global.fetch = jest.fn()

describe('AddStudentModal', () => {
  const courseId = 'test-course-id'
  const onClose = jest.fn()
  const onStudentAdded = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    render(<AddStudentModal courseId={courseId} onClose={onClose} onStudentAdded={onStudentAdded} />)
    expect(screen.getByText('Add New Student')).toBeInTheDocument()
    expect(screen.getByLabelText('Student Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Student ID')).toBeInTheDocument()
  })

  it('allows user to input values', () => {
    render(<AddStudentModal courseId={courseId} onClose={onClose} onStudentAdded={onStudentAdded} />)

    const nameInput = screen.getByLabelText('Student Name') as HTMLInputElement
    const idInput = screen.getByLabelText('Student ID') as HTMLInputElement

    fireEvent.change(nameInput, { target: { value: 'Alice' } })
    fireEvent.change(idInput, { target: { value: '12345678' } })

    expect(nameInput.value).toBe('Alice')
    expect(idInput.value).toBe('12345678')
  })

  it('submits form successfully and calls callbacks', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'term1', term: 'Fall', year: 2023 },
        { id: 'term2', term: 'Winter', year: 2023 }
      ],
    });

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: '1', name: 'Alice', studentId: '12345678' } }),
    });

    render(<AddStudentModal courseId={courseId} onClose={onClose} onStudentAdded={onStudentAdded} />);

    fireEvent.change(screen.getByLabelText('Student Name'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText('Student ID'), { target: { value: '12345678' } });

    const yearSelect = await screen.findByLabelText(/year/i);
    fireEvent.change(yearSelect, { target: { value: '2023' } });

    const termSelect = await screen.findByLabelText(/term/i);
    await waitFor(() => expect(termSelect).not.toBeDisabled());
    fireEvent.change(termSelect, { target: { value: 'term1' } });

    fireEvent.click(screen.getByText('Add Student'));

    await waitFor(() => {
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        `/api/courses/${courseId}/student`,
        expect.objectContaining({ method: 'POST' })
      );
      expect(onStudentAdded).toHaveBeenCalledWith(
        { id: '1', name: 'Alice', studentId: '12345678' },
        undefined
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
})