'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Home,
  Receipt,
  CheckCircle,
  BarChart3,
  Users,
  ClipboardList,
  Clock,
  UserCircle,
  X,
} from 'lucide-react';
import { Role } from '@/types/api';
import { cn } from '@/utils/cn';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
  badge?: number;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: Home,
  },
  {
    label: 'Transactions',
    href: '/transactions',
    icon: Receipt,
  },
  {
    label: 'Approvals',
    href: '/approvals',
    icon: CheckCircle,
    roles: [Role.ADMIN],
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: [Role.ADMIN, Role.SALES_MANAGER],
  },
  {
    label: 'Attendance',
    href: '/attendance',
    icon: Clock,
    roles: [Role.ADMIN, Role.SALES_MANAGER],
  },
  {
    label: 'My Reports',
    href: '/my-reports',
    icon: UserCircle,
    roles: [Role.SALES, Role.SALES_MANAGER],
  },
  {
    label: 'Users',
    href: '/users',
    icon: Users,
    roles: [Role.ADMIN],
  },
  {
    label: 'Audit Logs',
    href: '/audit',
    icon: ClipboardList,
    roles: [Role.ADMIN],
  },
];

interface SidebarProps {
  userRole: Role;
  isOpen: boolean;
  onClose: () => void;
  pendingCount?: number;
}

export function Sidebar({ userRole, isOpen, onClose, pendingCount }: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <>
      {/* Overlay - shown on all screens when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar - drawer style on all screens */}
      <aside
        className={cn(
          'fixed top-0 start-0 z-50 h-full w-64 bg-white border-e border-gray-200 transform transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Bright Code Logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className="text-lg font-semibold text-gray-900">Cashflow</span>
          </Link>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-500"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            const badge = item.href === '/approvals' ? pendingCount : undefined;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
                onClick={onClose}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {badge !== undefined && badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
