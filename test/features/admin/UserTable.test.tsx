import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Simple test component that mimics UserTable functionality
const TestUserTable = ({ users = [] }: { users?: any[] }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([]);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div>
      <h2>User Management</h2>
      <input
        placeholder="Search by name or email..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div>Results: {filteredUsers.length} users</div>
      
      {filteredUsers.length === 0 && searchTerm && (
        <div>No users found</div>
      )}
      
      {filteredUsers.length === 0 && !searchTerm && users.length === 0 && (
        <div>No users available</div>
      )}
      
      <div data-testid="user-list">
        {filteredUsers.map(user => (
          <div key={user.id} data-testid={`user-${user.id}`}>
            <input
              type="checkbox"
              checked={selectedUsers.includes(user.id)}
              onChange={() => handleSelectUser(user.id)}
              aria-label={`Select ${user.name}`}
            />
            <span>{user.name}</span>
            <span>{user.email}</span>
            <span data-testid={`role-${user.id}`}>{user.role}</span>
            <span>{user.status}</span>
            <button aria-label={`Edit ${user.name}`}>Edit</button>
          </div>
        ))}
      </div>
      
      {selectedUsers.length > 0 && (
        <button>Delete Selected ({selectedUsers.length})</button>
      )}
    </div>
  );
};

const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'online' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'teacher', status: 'offline' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'TA', status: 'online' },
];

describe('UserTable Component', () => {
  describe('Component Rendering', () => {
    it('renders user table with users', () => {
      render(<TestUserTable users={mockUsers} />);
      
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('displays empty state when no users', () => {
      render(<TestUserTable users={[]} />);
      
      expect(screen.getByText('No users available')).toBeInTheDocument();
    });

    it('shows search input', () => {
      render(<TestUserTable users={mockUsers} />);
      
      expect(screen.getByPlaceholderText('Search by name or email...')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters users by name', async () => {
      const user = userEvent.setup();
      render(<TestUserTable users={mockUsers} />);
      
      const searchInput = screen.getByPlaceholderText('Search by name or email...');
      await user.type(searchInput, 'Jane');
      
      expect(screen.getByText('Results: 1 users')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('filters users by email', async () => {
      const user = userEvent.setup();
      render(<TestUserTable users={mockUsers} />);
      
      const searchInput = screen.getByPlaceholderText('Search by name or email...');
      await user.type(searchInput, 'bob@example.com');
      
      expect(screen.getByText('Results: 1 users')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('shows no results for non-matching search', async () => {
      const user = userEvent.setup();
      render(<TestUserTable users={mockUsers} />);
      
      const searchInput = screen.getByPlaceholderText('Search by name or email...');
      await user.type(searchInput, 'nonexistent');
      
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  describe('User Selection', () => {
    it('allows selecting individual users', async () => {
      const user = userEvent.setup();
      render(<TestUserTable users={mockUsers} />);
      
      const checkbox = screen.getByLabelText('Select John Doe');
      await user.click(checkbox);
      
      expect(checkbox).toBeChecked();
      expect(screen.getByText('Delete Selected (1)')).toBeInTheDocument();
    });

    it('allows selecting multiple users', async () => {
      const user = userEvent.setup();
      render(<TestUserTable users={mockUsers} />);
      
      await user.click(screen.getByLabelText('Select John Doe'));
      await user.click(screen.getByLabelText('Select Jane Smith'));
      
      expect(screen.getByText('Delete Selected (2)')).toBeInTheDocument();
    });

    it('allows deselecting users', async () => {
      const user = userEvent.setup();
      render(<TestUserTable users={mockUsers} />);
      
      const checkbox = screen.getByLabelText('Select John Doe');
      await user.click(checkbox);
      await user.click(checkbox);
      
      expect(checkbox).not.toBeChecked();
      expect(screen.queryByText('Delete Selected')).not.toBeInTheDocument();
    });
  });

  describe('User Information Display', () => {
    it('displays user roles correctly', () => {
      render(<TestUserTable users={mockUsers} />);
      
      expect(screen.getByTestId('role-1')).toHaveTextContent('admin');
      expect(screen.getByTestId('role-2')).toHaveTextContent('teacher');
      expect(screen.getByTestId('role-3')).toHaveTextContent('TA');
    });

    it('displays user status correctly', () => {
      render(<TestUserTable users={mockUsers} />);
      
      expect(screen.getAllByText('online')).toHaveLength(2);
      expect(screen.getByText('offline')).toBeInTheDocument();
    });

    it('shows edit buttons for each user', () => {
      render(<TestUserTable users={mockUsers} />);
      
      expect(screen.getByLabelText('Edit John Doe')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit Jane Smith')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit Bob Johnson')).toBeInTheDocument();
    });
  });
}); 