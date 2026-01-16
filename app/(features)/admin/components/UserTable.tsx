"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import AddUserModal from "./AddUserModal";
import EditUserModal from "./EditUserModal";
import AuditLogModal from "./AuditLogModal";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  emailVerified?: Date | null;
  image?: string;
}

interface UserTableProps {
  users: User[];
  setUsers: (users: User[]) => void;
}

export default function UserTable({ users, setUsers }: UserTableProps) {
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [auditUser, setAuditUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const hasFetchedUsers = useRef(false);

  // Fetch real users from database - only once on mount
  useEffect(() => {
    const fetchUsers = async () => {
      if (hasFetchedUsers.current) {
        console.log('UserTable: Skipping fetch - already fetched');
        return;
      }

      try {
        setLoading(true);
        hasFetchedUsers.current = true;
        console.log('UserTable: Fetching users...');
        const response = await fetch('/api/admin/users');
        console.log('UserTable: Response status:', response.status);
        
        if (response.ok) {
          const userData = await response.json();
          console.log('UserTable: Received users:', userData);
          setUsers(userData);
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch users:', response.status, errorText);
          toast.error(`Failed to load users: ${response.status}`);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Error loading users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []); // Empty dependency array - only run once on mount

  const handleSelectUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map(user => user.id));
    }
  };

  const handleDeleteClick = () => {
    if (selectedUserIds.length === 0) {
      toast.error("Please select users to delete");
      return;
    }
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const deletedUsers = users.filter(user => selectedUserIds.includes(user.id));
      
      // Delete users via API
      const deletePromises = selectedUserIds.map(userId => 
        fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      
      // Update local state
      setUsers(users.filter(user => !selectedUserIds.includes(user.id)));
      
      if (deletedUsers.length === 1) {
        toast.success(`User ${deletedUsers[0].name} deleted successfully`);
      } else {
        toast.success(`${deletedUsers.length} users deleted successfully`);
      }
      
      setShowDeleteModal(false);
      setSelectedUserIds([]);
    } catch (error) {
      console.error('Error deleting users:', error);
      toast.error('Failed to delete users');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  // Filter and search logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.emailVerified) ||
      (statusFilter === "inactive" && !user.emailVerified);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setRoleFilter("all");
  };

  const handleAddUser = () => {
    setShowAddModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleViewAuditLog = (user: User) => {
    setAuditUser(user);
    setShowAuditModal(true);
  };

  const handleUserAdded = () => {
    // Refresh user list
    fetchUsers();
  };

  const handleUserUpdated = () => {
    // Refresh user list
    fetchUsers();
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      } else {
        console.error('Failed to fetch users:', response.status);
        toast.error(`Failed to load users: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-6">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">User Database</h2>
          <div className="flex space-x-3">
            <button 
              onClick={handleDeleteClick}
              disabled={selectedUserIds.length === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedUserIds.length === 0 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              Delete User{selectedUserIds.length > 1 ? 's' : ''} 
              {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
            </button>
            <button 
              onClick={handleAddUser}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Add New User
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3 items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="TEACHER">Teacher</option>
            </select>

            {(searchQuery || statusFilter !== "all" || roleFilter !== "all") && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredUsers.length} of {users.length} users
          {(searchQuery || statusFilter !== "all" || roleFilter !== "all") && (
            <span className="ml-2 text-blue-600">
              (filtered)
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Audit</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    {users.length === 0 ? (
                      <div>
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-1.5H21m-3-3l1.5-1.5M21 9l-3-3m0 0h7.5v1.5L21 9z" />
                        </svg>
                        <p className="mt-2 text-lg font-medium">No users found</p>
                        <p className="text-sm">Get started by adding your first user.</p>
                      </div>
                    ) : (
                      <div>
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="mt-2 text-lg font-medium">No users match your filters</p>
                        <p className="text-sm">Try adjusting your search or filter criteria.</p>
                        <button
                          onClick={clearFilters}
                          className="mt-3 text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Clear all filters
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr 
                  key={user.id} 
                  className={`hover:bg-gray-50 transition-colors ${
                    selectedUserIds.includes(user.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        {user.image ? (
                          <div className="h-8 w-8 rounded-full overflow-hidden">
                            <Image
                              src={user.image}
                              alt={`${user.name}'s profile`}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.emailVerified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        user.emailVerified ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      {user.emailVerified ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button 
                      onClick={() => handleViewAuditLog(user)}
                      className="inline-flex items-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View audit log"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleEditUser(user)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delete User</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>{selectedUserIds.length}</strong> user{selectedUserIds.length > 1 ? 's' : ''}? 
              This will permanently remove the user{selectedUserIds.length > 1 ? 's' : ''} and cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onUserAdded={handleUserAdded}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditModal}
        user={editingUser}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        onUserUpdated={handleUserUpdated}
      />

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={showAuditModal}
        userId={auditUser?.id || ''}
        userName={auditUser?.name || ''}
        onClose={() => {
          setShowAuditModal(false);
          setAuditUser(null);
        }}
      />
    </div>
  );
} 