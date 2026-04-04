'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, User } from 'lucide-react';
import { searchClients } from '@/lib/services/clients';
import type { ClientSearchResult } from '@/types/api';
import { cn } from '@/utils/cn';

interface ClientAutocompleteProps {
  value: ClientSearchResult | null;
  onChange: (client: ClientSearchResult | null) => void;
  required?: boolean;
  error?: string;
  label?: string;
}

export function ClientAutocomplete({ value, onChange, required, error, label }: ClientAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchClients(query);
        setResults(data);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (client: ClientSearchResult) => {
    onChange(client);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
  };

  if (value) {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ms-1">*</span>}
          </label>
        )}
        <div className={cn(
          'flex items-center gap-3 px-3 py-2 border rounded-lg bg-gray-50',
          error ? 'border-red-500' : 'border-gray-300'
        )}>
          <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-900">{value.clientCode}</span>
            <span className="text-sm text-gray-600 mx-1">-</span>
            <span className="text-sm text-gray-900">{value.name}</span>
            {value.phone && (
              <>
                <span className="text-sm text-gray-400 mx-1">-</span>
                <span className="text-sm text-gray-500">{value.phone}</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="w-full" ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ms-1">*</span>}
        </label>
      )}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, or code..."
          className={cn(
            'block w-full ps-10 pe-3 py-2 border rounded-lg shadow-sm placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            error ? 'border-red-500' : 'border-gray-300'
          )}
        />
        {isLoading && (
          <div className="absolute end-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => handleSelect(client)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-blue-50 transition-colors"
            >
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-mono text-blue-600">{client.clientCode}</span>
                <span className="text-sm text-gray-600 mx-1">-</span>
                <span className="text-sm font-medium text-gray-900">{client.name}</span>
                {client.phone && (
                  <span className="text-sm text-gray-500 ms-2">{client.phone}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500 text-center">
          No clients found
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
