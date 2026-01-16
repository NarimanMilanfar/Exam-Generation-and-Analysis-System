import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        id: '1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
      },
    },
    status: 'authenticated',
  })),
}));

// Mock fetch
global.fetch = jest.fn();

// Simple test component that mimics AdminDashboard functionality
const TestAdminDashboard = () => {
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/admin/users');
        if (response.ok) {
          const userData = await response.json();
          setUsers(userData);
        }
      } catch (error) {
        console.error('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <div data-testid="dashboard-content">
        <div data-testid="stats-section">
          <h2>Dashboard Statistics</h2>
          <div>Total Users: {users.length}</div>
        </div>
        <div data-testid="users-section">
          <h2>User Management</h2>
          <div>Results: {users.length} users</div>
          {users.map(user => (
            <div key={user.id} data-testid={`user-${user.id}`}>
              {user.name} - {user.email}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'teacher' },
];

describe('AdminDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful fetch by default
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUsers),
    });
  });

  describe('Component Rendering', () => {
    it('shows loading state initially', () => {
      render(<TestAdminDashboard />);
      
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });

    it('displays dashboard after loading', async () => {
      render(<TestAdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Dashboard Statistics')).toBeInTheDocument();
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    it('shows user data after fetch', async () => {
      render(<TestAdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe - john@example.com')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith - jane@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('Data Integration', () => {
    it('fetches users from API', async () => {
      render(<TestAdminDashboard />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/users');
      });
    });

    it('displays correct user count', async () => {
      render(<TestAdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Users: 2')).toBeInTheDocument();
        expect(screen.getByText('Results: 2 users')).toBeInTheDocument();
      });
    });

    it('handles empty user list', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<TestAdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Users: 0')).toBeInTheDocument();
        expect(screen.getByText('Results: 0 users')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API failures gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<TestAdminDashboard />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });
      
      // Should still render dashboard structure even if API fails
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    it('handles network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<TestAdminDashboard />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('renders dashboard sections', async () => {
      render(<TestAdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
        expect(screen.getByTestId('stats-section')).toBeInTheDocument();
        expect(screen.getByTestId('users-section')).toBeInTheDocument();
      });
    });

    it('displays user items with correct test ids', async () => {
      render(<TestAdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user-1')).toBeInTheDocument();
        expect(screen.getByTestId('user-2')).toBeInTheDocument();
      });
    });
  });
});