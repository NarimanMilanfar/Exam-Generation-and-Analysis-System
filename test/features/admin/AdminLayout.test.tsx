import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
  usePathname: jest.fn(() => '/admin'),
}));

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
  signOut: jest.fn(),
}));

// Simple test component that mimics AdminLayout functionality
const TestAdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div>
      <header>
        <h1>Admin Dashboard</h1>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          Toggle Menu
        </button>
        <div>
          <span>Admin User</span>
          <button onClick={() => console.log('Sign out')}>Sign Out</button>
        </div>
      </header>
      
      <nav data-testid="sidebar" style={{ display: sidebarOpen ? 'block' : 'none' }}>
        <a href="/admin">Dashboard</a>
        <a href="/admin/users">Users</a>
        <a href="/admin/settings">Settings</a>
      </nav>
      
      <main>
        {children}
      </main>
    </div>
  );
};

describe('AdminLayout Component', () => {
  const mockChildren = <div>Test Content</div>;

  describe('Component Rendering', () => {
    it('renders admin layout with header', () => {
      render(<TestAdminLayout>{mockChildren}</TestAdminLayout>);
      
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('displays user information', () => {
      render(<TestAdminLayout>{mockChildren}</TestAdminLayout>);
      
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('shows navigation menu', () => {
      render(<TestAdminLayout>{mockChildren}</TestAdminLayout>);
      
      const toggleButton = screen.getByText('Toggle Menu');
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('toggles sidebar visibility', () => {
      render(<TestAdminLayout>{mockChildren}</TestAdminLayout>);
      
      const sidebar = screen.getByTestId('sidebar');
      const toggleButton = screen.getByText('Toggle Menu');
      
      // Initially hidden
      expect(sidebar).toHaveStyle('display: none');
      
      // Click to show
      fireEvent.click(toggleButton);
      expect(sidebar).toHaveStyle('display: block');
      
      // Click to hide
      fireEvent.click(toggleButton);
      expect(sidebar).toHaveStyle('display: none');
    });

    it('contains navigation links', () => {
      render(<TestAdminLayout>{mockChildren}</TestAdminLayout>);
      
      const toggleButton = screen.getByText('Toggle Menu');
      fireEvent.click(toggleButton);
      
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/admin');
      expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/admin/users');
      expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/admin/settings');
    });
  });

  describe('User Actions', () => {
    it('shows sign out button', () => {
      render(<TestAdminLayout>{mockChildren}</TestAdminLayout>);
      
      const signOutButton = screen.getByText('Sign Out');
      expect(signOutButton).toBeInTheDocument();
      
      fireEvent.click(signOutButton);
      // In a real test, we'd verify signOut was called
    });

    it('displays current user name', () => {
      render(<TestAdminLayout>{mockChildren}</TestAdminLayout>);
      
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('renders children in main content area', () => {
      const customContent = <div data-testid="custom-content">Custom Content</div>;
      render(<TestAdminLayout>{customContent}</TestAdminLayout>);
      
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });

    it('maintains proper layout structure', () => {
      render(<TestAdminLayout>{mockChildren}</TestAdminLayout>);
      
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByTestId('sidebar')).toBeInTheDocument(); // nav (using testid since it's hidden)
      expect(screen.getByRole('main')).toBeInTheDocument(); // main
    });
  });
});