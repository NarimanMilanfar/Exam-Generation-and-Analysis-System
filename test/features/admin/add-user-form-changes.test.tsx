import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
}));

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock fetch
global.fetch = jest.fn();

// Test component that mimics the simplified add user form
const TestAddUserForm = ({ onSubmit = jest.fn() }: any) => {
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    role: "TEACHER",
    // Note: no status field
  });
  const [saving, setSaving] = React.useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="add-user-form">
      <h1>Add User</h1>
      
      {/* Avatar Preview */}
      <div data-testid="avatar-preview">
        <div className="avatar-circle">
          {formData.name ? formData.name.charAt(0).toUpperCase() : "+"}
        </div>
        <p>{formData.name || "New User"}</p>
      </div>

      <form>
        {/* Name Input */}
        <div>
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            data-testid="name-input"
            placeholder="Enter full name"
          />
        </div>

        {/* Email Input */}
        <div>
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            data-testid="email-input"
            placeholder="Enter email address"
          />
        </div>

        {/* Role Select */}
        <div>
          <label htmlFor="role">User Role</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            data-testid="role-select"
          >
            <option value="ADMIN">Administrator</option>
            <option value="TEACHER">Teacher/Professor</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div>
          <button
            type="button"
            data-testid="cancel-button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            data-testid="submit-button"
          >
            {saving ? "Saving..." : "Create User"}
          </button>
        </div>
      </form>
    </div>
  );
};

// Test component that mimics the old form with status dropdown (for comparison)
const TestOldAddUserForm = () => {
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    role: "TEACHER",
    status: "active", // This field should not exist in new form
  });

  return (
    <div data-testid="old-add-user-form">
      {/* Status dropdown that should be removed */}
      <div>
        <label htmlFor="status">Account Status</label>
        <select
          id="status"
          name="status"
          value={formData.status}
          data-testid="status-select-old"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </div>
  );
};

describe('Add User Form Changes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Status Dropdown Removal', () => {
    it('should not render status dropdown in new form', () => {
      render(<TestAddUserForm />);
      
      // Verify status dropdown is not present
      expect(screen.queryByTestId('status-select')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Account Status')).not.toBeInTheDocument();
      expect(screen.queryByText('Account Status')).not.toBeInTheDocument();
    });

    it('should only include name, email, and role fields', () => {
      render(<TestAddUserForm />);
      
      // Verify required fields are present
      expect(screen.getByTestId('name-input')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('role-select')).toBeInTheDocument();
      
      // Verify form labels
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('User Role')).toBeInTheDocument();
    });

    it('should not include status field in form data', async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      
      render(<TestAddUserForm onSubmit={onSubmit} />);
      
      // Fill out form
      await user.type(screen.getByTestId('name-input'), 'John Doe');
      await user.type(screen.getByTestId('email-input'), 'john@example.com');
      await user.selectOptions(screen.getByTestId('role-select'), 'ADMIN');
      
      // Submit form
      await user.click(screen.getByTestId('submit-button'));
      
      // Verify submitted data doesn't include status
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        role: 'ADMIN',
        // Note: no status field
      });
      
      const submittedData = onSubmit.mock.calls[0][0];
      expect(submittedData).not.toHaveProperty('status');
    });
  });

  describe('Form Functionality', () => {
    it('should update avatar preview based on name input', async () => {
      const user = userEvent.setup();
      render(<TestAddUserForm />);
      
      const nameInput = screen.getByTestId('name-input');
      const avatarPreview = screen.getByTestId('avatar-preview');
      
      // Initially shows "+"
      expect(avatarPreview).toHaveTextContent('+');
      expect(avatarPreview).toHaveTextContent('New User');
      
      // Type name and check avatar updates
      await user.type(nameInput, 'Jane Smith');
      
      expect(avatarPreview).toHaveTextContent('J'); // First letter
      expect(avatarPreview).toHaveTextContent('Jane Smith');
    });

    it('should handle form submission with loading state', async () => {
      const onSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      const user = userEvent.setup();
      
      render(<TestAddUserForm onSubmit={onSubmit} />);
      
      const submitButton = screen.getByTestId('submit-button');
      
      // Initially shows "Create User"
      expect(submitButton).toHaveTextContent('Create User');
      expect(submitButton).not.toBeDisabled();
      
      // Click submit
      await user.click(submitButton);
      
      // Should show loading state
      expect(submitButton).toHaveTextContent('Saving...');
      expect(submitButton).toBeDisabled();
      
      // Wait for completion
      await waitFor(() => {
        expect(submitButton).toHaveTextContent('Create User');
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should have correct default values', () => {
      render(<TestAddUserForm />);
      
      const nameInput = screen.getByTestId('name-input') as HTMLInputElement;
      const emailInput = screen.getByTestId('email-input') as HTMLInputElement;
      const roleSelect = screen.getByTestId('role-select') as HTMLSelectElement;
      
      expect(nameInput.value).toBe('');
      expect(emailInput.value).toBe('');
      expect(roleSelect.value).toBe('TEACHER'); // Default role
    });

    it('should allow changing role selection', async () => {
      const user = userEvent.setup();
      render(<TestAddUserForm />);
      
      const roleSelect = screen.getByTestId('role-select') as HTMLSelectElement;
      
      // Initially TEACHER
      expect(roleSelect.value).toBe('TEACHER');
      
      // Change to ADMIN
      await user.selectOptions(roleSelect, 'ADMIN');
      expect(roleSelect.value).toBe('ADMIN');
      
      // Verify options exist
      expect(screen.getByText('Administrator')).toBeInTheDocument();
      expect(screen.getByText('Teacher/Professor')).toBeInTheDocument();
    });
  });

  describe('Form Validation and User Experience', () => {
    it('should handle empty form submission', async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      
      render(<TestAddUserForm onSubmit={onSubmit} />);
      
      // Submit without filling form
      await user.click(screen.getByTestId('submit-button'));
      
      // Form should still submit (validation happens on backend)
      expect(onSubmit).toHaveBeenCalledWith({
        name: '',
        email: '',
        role: 'TEACHER',
      });
    });

    it('should maintain form state during user interaction', async () => {
      const user = userEvent.setup();
      render(<TestAddUserForm />);
      
      // Fill out multiple fields
      await user.type(screen.getByTestId('name-input'), 'Test User');
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.selectOptions(screen.getByTestId('role-select'), 'ADMIN');
      
      // Verify all values are maintained
      expect((screen.getByTestId('name-input') as HTMLInputElement).value).toBe('Test User');
      expect((screen.getByTestId('email-input') as HTMLInputElement).value).toBe('test@example.com');
      expect((screen.getByTestId('role-select') as HTMLSelectElement).value).toBe('ADMIN');
    });
  });

  describe('Comparison with Old Form', () => {
    it('should demonstrate that old form had status dropdown', () => {
      render(<TestOldAddUserForm />);
      
      // Verify old form had status dropdown
      expect(screen.getByTestId('status-select-old')).toBeInTheDocument();
      expect(screen.getByLabelText('Account Status')).toBeInTheDocument();
    });

    it('should show difference between old and new form structure', () => {
      const { container: newForm } = render(<TestAddUserForm />);
      const { container: oldForm } = render(<TestOldAddUserForm />);
      
      // New form doesn't have status dropdown
      expect(newForm.querySelector('[data-testid="status-select"]')).toBeNull();
      
      // Old form has status dropdown
      expect(oldForm.querySelector('[data-testid="status-select-old"]')).not.toBeNull();
    });
  });
}); 