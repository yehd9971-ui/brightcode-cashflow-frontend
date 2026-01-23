'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, ChevronDown } from 'lucide-react';
import { UserResponseDto, Role } from '@/types/api';
import { getInitials } from '@/utils/formatters';
import { cn } from '@/utils/cn';

interface NavbarProps {
  user: UserResponseDto;
  onMenuClick: () => void;
  onLogout: () => void;
}

export function Navbar({
  user,
  onMenuClick,
  onLogout,
}: NavbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left side */}
        <button
          onClick={onMenuClick}
          className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Right side */}
        <div className="flex items-center gap-2 ms-auto">
          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {getInitials(user.email)}
                </span>
              </div>
              <div className="hidden sm:block text-start">
                <p className="text-sm font-medium text-gray-700">{user.email}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-gray-400 transition-transform',
                  isUserMenuOpen && 'rotate-180'
                )}
              />
            </button>

            {/* Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute end-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  <p className="text-xs text-gray-500">
                    {user.role === Role.ADMIN ? 'Administrator' : 'Sales'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
