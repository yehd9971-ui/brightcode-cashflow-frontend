'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, UserCheck, UserX, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUsers,
  createUser,
  updateUser,
  activateUser,
  deactivateUser,
} from '@/lib/services/users';
import {
  Role,
  UserResponseDto,
  CreateUserDto,
  UpdateUserDto,
  ErrorResponse,
  VALIDATION_RULES,
} from '@/types/api';
import { formatDateShort } from '@/utils/formatters';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

const roleOptions = [
  { value: '', label: 'All Roles' },
  { value: Role.ADMIN, label: 'Admin' },
  { value: Role.SALES, label: 'Sales' },
];

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const roleFormOptions = [
  { value: Role.SALES, label: 'Sales' },
  { value: Role.ADMIN, label: 'Admin' },
];

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponseDto | null>(null);

  const [formData, setFormData] = useState<CreateUserDto>({
    email: '',
    password: '',
    role: Role.SALES,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const limit = 20;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['users', { page, role: roleFilter, isActive: statusFilter }],
    queryFn: () =>
      getUsers({
        page,
        limit,
        role: roleFilter ? (roleFilter as Role) : undefined,
        isActive: statusFilter ? statusFilter === 'true' : undefined,
      }),
  });

  const users = data?.data || [];
  const totalPages = Math.ceil((data?.total || 0) / limit);

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success('User created successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      if (error.response?.status === 409) {
        setFormErrors({ email: 'Email already registered' });
      } else {
        toast.error('Failed to create user');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      updateUser(id, data),
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to update user');
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateUser,
    onSuccess: () => {
      toast.success('User activated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowActivateConfirm(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast.error('Failed to activate user');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      toast.success('User deactivated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowDeactivateConfirm(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast.error('Failed to deactivate user');
    },
  });

  const resetForm = () => {
    setFormData({ email: '', password: '', role: Role.SALES });
    setFormErrors({});
  };

  const validateForm = (isCreate: boolean): boolean => {
    const errors: Record<string, string> = {};

    if (isCreate) {
      if (!VALIDATION_RULES.email.pattern.test(formData.email)) {
        errors.email = 'Please enter a valid email';
      }
      if (formData.password.length < VALIDATION_RULES.password.minLength) {
        errors.password = `Password must be at least ${VALIDATION_RULES.password.minLength} characters`;
      }
    } else {
      // Edit mode - password is optional
      if (formData.password && formData.password.length < VALIDATION_RULES.password.minLength) {
        errors.password = `Password must be at least ${VALIDATION_RULES.password.minLength} characters`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = () => {
    if (!validateForm(true)) return;
    createMutation.mutate(formData);
  };

  const handleEdit = (user: UserResponseDto) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
    });
    setShowEditModal(true);
  };

  const handleUpdate = () => {
    if (!selectedUser || !validateForm(false)) return;

    const updateData: UpdateUserDto = {
      role: formData.role,
    };

    if (formData.password) {
      updateData.password = formData.password;
    }

    updateMutation.mutate({ id: selectedUser.id, data: updateData });
  };

  const isOwnAccount = (userId: string) => currentUser?.id === userId;

  return (
    <ProtectedRoute requiredRole={Role.ADMIN}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
            <p className="text-gray-500">Manage user accounts and permissions</p>
          </div>

          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 me-2" />
            Create User
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              options={roleOptions}
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by role"
            />
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by status"
            />
          </div>
        </Card>

        {/* Users Table */}
        <Card padding="none">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={5} />
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              title="No users found"
              description="Create your first user to get started"
              action={
                <Button size="sm" onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 me-2" />
                  Create User
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                        Email
                      </th>
                      <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                        Role
                      </th>
                      <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                        Status
                      </th>
                      <th className="text-start text-sm font-medium text-gray-500 px-4 py-3">
                        Created
                      </th>
                      <th className="text-end text-sm font-medium text-gray-500 px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {user.email}
                          {isOwnAccount(user.id) && (
                            <span className="ms-2 text-xs text-gray-400">(You)</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={user.role === Role.ADMIN ? 'info' : 'neutral'}
                          >
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.isActive ? 'success' : 'error'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDateShort(user.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-end">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {user.role === Role.ADMIN ? (
                              <span className="p-2 text-gray-400" title="Admin accounts are protected">
                                <Lock className="w-4 h-4" />
                              </span>
                            ) : user.isActive ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeactivateConfirm(true);
                                }}
                                disabled={isOwnAccount(user.id)}
                                title={isOwnAccount(user.id) ? 'Cannot deactivate yourself' : ''}
                              >
                                <UserX className="w-4 h-4 text-red-500" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowActivateConfirm(true);
                                }}
                              >
                                <UserCheck className="w-4 h-4 text-green-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 border-t border-gray-200">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  loading={isFetching}
                  total={data?.total || 0}
                  limit={limit}
                />
              </div>
            </>
          )}
        </Card>

        {/* Create User Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          title="Create User"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                loading={createMutation.isPending}
              >
                Create
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
              required
            />
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={formErrors.password}
              required
              helperText="Minimum 8 characters"
            />
            <Select
              label="Role"
              options={roleFormOptions}
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value as Role })
              }
            />
          </div>
        </Modal>

        {/* Edit User Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            resetForm();
          }}
          title="Edit User"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                loading={updateMutation.isPending}
              >
                Save
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              disabled
              helperText="Email cannot be changed"
            />
            <Input
              label="New Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={formErrors.password}
              placeholder="Leave blank to keep current"
              helperText="Minimum 8 characters if changing"
            />
            <Select
              label="Role"
              options={roleFormOptions}
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value as Role })
              }
              disabled={selectedUser?.role === Role.ADMIN}
            />
            {selectedUser?.role === Role.ADMIN && (
              <p className="text-sm text-gray-500 mt-1">Admin role cannot be changed</p>
            )}
          </div>
        </Modal>

        {/* Deactivate Confirmation */}
        {selectedUser && (
          <ConfirmDialog
            isOpen={showDeactivateConfirm}
            onClose={() => {
              setShowDeactivateConfirm(false);
              setSelectedUser(null);
            }}
            onConfirm={() => deactivateMutation.mutate(selectedUser.id)}
            title="Deactivate User"
            message={`Deactivate ${selectedUser.email}? They will be logged out and unable to access the system.`}
            confirmText="Deactivate"
            variant="danger"
            loading={deactivateMutation.isPending}
          />
        )}

        {/* Activate Confirmation */}
        {selectedUser && (
          <ConfirmDialog
            isOpen={showActivateConfirm}
            onClose={() => {
              setShowActivateConfirm(false);
              setSelectedUser(null);
            }}
            onConfirm={() => activateMutation.mutate(selectedUser.id)}
            title="Activate User"
            message={`Activate ${selectedUser.email}? They will be able to log in again.`}
            confirmText="Activate"
            loading={activateMutation.isPending}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
