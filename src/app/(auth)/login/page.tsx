'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { ErrorResponse } from '@/types/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  // Rate limit countdown
  useEffect(() => {
    if (rateLimitCountdown > 0) {
      const timer = setTimeout(() => {
        setRateLimitCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [rateLimitCountdown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (rateLimitCountdown > 0) {
      return;
    }

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Login successful!');
      router.push('/');
    } catch (err) {
      const axiosError = err as AxiosError<ErrorResponse>;

      if (axiosError.response?.status === 429) {
        setRateLimitCountdown(60);
        setError('Too many login attempts. Please wait 60 seconds.');
      } else if (axiosError.response?.status === 401) {
        const message = axiosError.response.data?.message || '';
        if (message.toLowerCase().includes('deactivated')) {
          setError('Your account has been deactivated. Contact administrator.');
        } else {
          setError('Invalid email or password');
        }
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Bright Code"
            className="w-16 h-16 mb-4 mx-auto"
          />
          <h1 className="text-2xl font-bold text-gray-900">
            Cashflow Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert type="error" dismissible onDismiss={() => setError('')}>
                {error}
              </Alert>
            )}

            {rateLimitCountdown > 0 && (
              <Alert type="warning">
                Try again in {rateLimitCountdown} seconds...
              </Alert>
            )}

            <Input
              label="Email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading || rateLimitCountdown > 0}
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading || rateLimitCountdown > 0}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-8 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={isLoading}
              disabled={rateLimitCountdown > 0}
            >
              Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          &copy; {new Date().getFullYear()} Bright Code. All rights reserved.
        </p>
      </div>
    </div>
  );
}
