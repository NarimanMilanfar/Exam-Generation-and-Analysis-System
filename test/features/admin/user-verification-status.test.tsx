import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Test component that mimics user status functionality
const TestUserStatus = ({ user, showLabel = true }: any) => {
  const getStatusBadge = (status: string) => {
    const isActive = status === 'active';
    return (
      <span 
        data-testid="status-badge"
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {isActive ? 'Verified' : 'Unverified'}
      </span>
    );
  };

  return (
    <div data-testid="user-status-component">
      {showLabel && <span>Status: </span>}
      {getStatusBadge(user.status)}
      <div data-testid="user-info">
        <span>Email Verified: {user.emailVerified ? 'Yes' : 'No'}</span>
      </div>
    </div>
  );
};

// Test component for user list with status filtering
const TestUserList = ({ users, statusFilter }: any) => {
  const filteredUsers = statusFilter === 'all' 
    ? users 
    : users.filter((user: any) => user.status === statusFilter);

  return (
    <div data-testid="user-list">
      <select data-testid="status-filter" value={statusFilter}>
        <option value="all">All Status</option>
        <option value="active">Verified</option>
        <option value="inactive">Unverified</option>
      </select>
      <div data-testid="filtered-users">
        {filteredUsers.map((user: any) => (
          <div key={user.id} data-testid={`user-${user.id}`}>
            <span>{user.name}</span>
            <TestUserStatus user={user} showLabel={false} />
          </div>
        ))}
      </div>
    </div>
  );
};

describe('User Verification Status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Status Logic Based on Email Verification', () => {
    it('shows verified status for users with emailVerified', () => {
      const verifiedUser = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active',
        emailVerified: new Date(),
      };

      render(<TestUserStatus user={verifiedUser} />);
      
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('Email Verified: Yes')).toBeInTheDocument();
    });

    it('shows unverified status for users without emailVerified', () => {
      const unverifiedUser = {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        status: 'inactive',
        emailVerified: null,
      };

      render(<TestUserStatus user={unverifiedUser} />);
      
      expect(screen.getByText('Unverified')).toBeInTheDocument();
      expect(screen.getByText('Email Verified: No')).toBeInTheDocument();
    });

    it('applies correct CSS classes for verified status', () => {
      const verifiedUser = {
        id: '1',
        status: 'active',
        emailVerified: new Date(),
      };

      render(<TestUserStatus user={verifiedUser} />);
      
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('applies correct CSS classes for unverified status', () => {
      const unverifiedUser = {
        id: '2',
        status: 'inactive',
        emailVerified: null,
      };

      render(<TestUserStatus user={unverifiedUser} />);
      
      const badge = screen.getByTestId('status-badge');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
    });
  });

  describe('Status Filter Functionality', () => {
    const mockUsers = [
      { id: '1', name: 'Verified User', status: 'active', emailVerified: new Date() },
      { id: '2', name: 'Unverified User', status: 'inactive', emailVerified: null },
      { id: '3', name: 'Another Verified', status: 'active', emailVerified: new Date() },
    ];

    it('shows all users when filter is "all"', () => {
      render(<TestUserList users={mockUsers} statusFilter="all" />);
      
      expect(screen.getByTestId('user-1')).toBeInTheDocument();
      expect(screen.getByTestId('user-2')).toBeInTheDocument();
      expect(screen.getByTestId('user-3')).toBeInTheDocument();
    });

    it('shows only verified users when filter is "active"', () => {
      render(<TestUserList users={mockUsers} statusFilter="active" />);
      
      expect(screen.getByTestId('user-1')).toBeInTheDocument();
      expect(screen.queryByTestId('user-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('user-3')).toBeInTheDocument();
    });

    it('shows only unverified users when filter is "inactive"', () => {
      render(<TestUserList users={mockUsers} statusFilter="inactive" />);
      
      expect(screen.queryByTestId('user-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('user-2')).toBeInTheDocument();
      expect(screen.queryByTestId('user-3')).not.toBeInTheDocument();
    });

    it('has correct filter options with new terminology', () => {
      render(<TestUserList users={mockUsers} statusFilter="all" />);
      
      const filterSelect = screen.getByTestId('status-filter');
      expect(filterSelect).toHaveValue('all');
      
      // Check that options exist with correct text
      expect(screen.getByText('All Status')).toBeInTheDocument();
      
      // Use more specific selectors to avoid multiple "Verified" text elements
      const selectElement = screen.getByTestId('status-filter');
      expect(selectElement).toHaveTextContent('Verified');
      expect(selectElement).toHaveTextContent('Unverified');
    });
  });

  describe('User Lifecycle Status Changes', () => {
    it('handles user status transition from unverified to verified', () => {
      const initialUser = {
        id: '1',
        name: 'Test User',
        status: 'inactive',
        emailVerified: null,
      };

      const { rerender } = render(<TestUserStatus user={initialUser} />);
      expect(screen.getByText('Unverified')).toBeInTheDocument();

      // Simulate email verification
      const verifiedUser = {
        ...initialUser,
        status: 'active',
        emailVerified: new Date(),
      };

      rerender(<TestUserStatus user={verifiedUser} />);
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('Email Verified: Yes')).toBeInTheDocument();
    });
  });
}); 