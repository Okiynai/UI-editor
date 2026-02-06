'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/atoms/button';
import { ComponentNode } from '@/OSDL.types';
import { FcGoogle } from 'react-icons/fc';
import API_URL, { getApiUrl } from '@/config';
import { useData } from '@/osdl/contexts/DataContext';
import Link from 'next/link';
import { User as UserIcon } from 'lucide-react';

interface ModalButtonComponentProps {
	id: string;
	nodeSchema: ComponentNode;
	style?: React.CSSProperties;
	className?: string;
	buttonText?: string;
	buttonVariant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'default' | 'outline';
	buttonSize?: 'sm' | 'md' | 'lg' | 'icon';
	content?: string | { text: string; icon?: React.ReactNode };
}

type AuthView = 'login' | 'signup' | 'verify';

const ModalButtonComponent: React.FC<ModalButtonComponentProps> = ({
	id,
	nodeSchema,
	style,
	className,
	buttonText = 'Sign In',
	buttonVariant = 'primary',
	buttonSize = 'md',
	content,
}) => {
	const [open, setOpen] = useState(false);
	const { userInfo } = useData();
	const [menuOpen, setMenuOpen] = useState(false);
	const [currentView, setCurrentView] = useState<AuthView>('login');
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		confirmPassword: '',
		verificationCode: ''
	});
	const [showPassword, setShowPassword] = useState(false);
	const [passwordStrength, setPasswordStrength] = useState<any>(null);
	const [codeSent, setCodeSent] = useState(false);
	const [resendDisabled, setResendDisabled] = useState(false);
	const [countdown, setCountdown] = useState(60);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isLoading, setIsLoading] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [tenantDomain, setTenantDomain] = useState<string>('');
	const [apiUrl, setApiUrl] = useState<string>('');
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Ensure component is mounted before rendering portal
	useEffect(() => {
		setMounted(true);
		// Extract tenant domain from window location and get API URL from config
		if (typeof window !== 'undefined') {
			const hostname = window.location.hostname;
			const port = window.location.port;
			const domain = port ? `${hostname}:${port}` : hostname;
			setTenantDomain(domain);
			// Use the proper API URL from config
			setApiUrl(getApiUrl());
		}
	}, []);

	// Password strength evaluation function
	const getPasswordStrength = (password: string) => {
		const hasLower = /[a-z]/.test(password);
		const hasUpper = /[A-Z]/.test(password);
		const hasNumber = /\d/.test(password);
		const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
		const length = password.length;

		const score = [hasLower, hasUpper, hasNumber, hasSpecial]
			.filter(Boolean).length + (length >= 8 ? 1 : 0);

		const strengths = [
			{ score: 0, message: 'Very Weak', color: 'bg-red-500' },
			{ score: 1, message: 'Weak', color: 'bg-orange-500' },
			{ score: 2, message: 'Fair', color: 'bg-yellow-500' },
			{ score: 3, message: 'Good', color: 'bg-lime-500' },
			{ score: 4, message: 'Strong', color: 'bg-green-500' }
		];

		return strengths[Math.min(score, 4)];
	};

	// Allow schema params to override props if provided from OSDL
	const params = (nodeSchema as any)?.params || {};
	const finalButtonText = params.buttonText ?? buttonText;
	const finalButtonVariant = params.buttonVariant ?? buttonVariant;
	const finalButtonSize = params.buttonSize ?? buttonSize;

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: value }));
		if (errors[name]) {
			setErrors(prev => ({ ...prev, [name]: '' }));
		}

		if (name === 'password') {
			setPasswordStrength(value ? getPasswordStrength(value) : null);
		}
	};

	const resetFormData = () => {
		setFormData({
			email: '',
			password: '',
			confirmPassword: '',
			verificationCode: ''
		});
		setErrors({});
		setPasswordStrength(null);
	};

	const switchToLogin = () => {
		resetFormData();
		setCurrentView('login');
	};

	const switchToSignup = () => {
		resetFormData();
		setCurrentView('signup');
	};




	// No JS form submission; we use real HTML forms with action+method like sso-test

	// Send verification code like sso-signup page does
	const sendVerificationCode = async () => {
		// Basic validation
		if (!formData.email) {
			setErrors({ email: 'Email is required' });
			return;
		}
		if (formData.password.length < 8) {
			setErrors({ password: 'Password must be at least 8 characters' });
			return;
		}
		if (formData.password !== formData.confirmPassword) {
			setErrors({ confirmPassword: 'Passwords do not match' });
			return;
		}

		setIsLoading(true);
		try {
			// Move to verification view immediately for UX parity
			setCurrentView('verify');
			setCodeSent(true);

			const base = apiUrl;
			const response = await fetch(`${base}/api/v1/auth/mailing/send-verification-code`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: formData.email })
			});

			// If failed, surface a simple error
			if (!response.ok) {
				setErrors({ email: 'Failed to send verification code' });
				return;
			}

			// Start resend cooldown
			setResendDisabled(true);
		} catch (err) {
			setErrors({ email: 'Failed to send verification code' });
		} finally {
			setIsLoading(false);
		}
	};

	// Resend code handler
	const handleResendCode = async () => {
		if (resendDisabled) return;
		await sendVerificationCode();
	};

	// Countdown for resend
	useEffect(() => {
		if (!resendDisabled) return;
		if (countdown <= 0) {
			setResendDisabled(false);
			setCountdown(60);
			return;
		}
		const t = setTimeout(() => setCountdown(countdown - 1), 1000);
		return () => clearTimeout(t);
	}, [resendDisabled, countdown]);

	// Click outside to close dropdown
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		};

		if (menuOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [menuOpen]);

	const renderAuthForm = () => {
		switch (currentView) {
			case 'login':
				return (
					<div className="space-y-4">
						<div className="text-center">
							<h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
							<p className="text-gray-600">Sign in to your account</p>
						</div>

						<a
							href={apiUrl && tenantDomain ? `${apiUrl}/api/v1/auth/signin/google?sso=true&tenant_domain=${encodeURIComponent(tenantDomain)}` : '#'}
							className={`w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${!apiUrl || !tenantDomain ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
						>
							<FcGoogle className="w-5 h-5" />
							<span className="text-gray-700 font-medium">Continue with Google (SSO)</span>
						</a>

						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-gray-300" />
							</div>
							<div className="relative flex justify-center text-sm">
								<span className="px-2 bg-white text-gray-500">Or continue with email</span>
							</div>
						</div>

				<form action={`${apiUrl}/api/v1/sso/signin`} method="POST" className="space-y-4">
					<input type="hidden" name="tenant_domain" value={tenantDomain} />
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Email
								</label>
								<input
									type="email"
									name="email"
							value={formData.email}
							onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									required
								/>
								{errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Password
								</label>
						<input
									type="password"
									name="password"
									value={formData.password}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									required
								/>
								{errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
							</div>

							<button
								type="submit"
								className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
							>
								Sign In
							</button>
						</form>

						<div className="text-center">
							<button
								onClick={switchToSignup}
								className="text-blue-600 hover:text-blue-500 text-sm"
							>
								Don't have an account? Sign up
							</button>
						</div>
					</div>
				);

			case 'signup':
				return (
					<div className="space-y-4">
						<div className="text-center">
							<h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
							<p className="text-gray-600">Sign up for a new account</p>
						</div>

						<a
							href={apiUrl && tenantDomain ? `${apiUrl}/api/v1/auth/signin/google?sso=true&tenant_domain=${encodeURIComponent(tenantDomain)}` : '#'}
							className={`w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${!apiUrl || !tenantDomain ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
						>
							<FcGoogle className="w-5 h-5" />
							<span className="text-gray-700 font-medium">Continue with Google (SSO)</span>
						</a>

						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-gray-300" />
							</div>
							<div className="relative flex justify-center text-sm">
								<span className="px-2 bg-white text-gray-500">Or continue with email</span>
							</div>
						</div>

				<form className="space-y-4" onSubmit={(e) => { e.preventDefault(); sendVerificationCode(); }}>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Email
								</label>
								<input
									type="email"
									name="email"
									value={formData.email}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									required
								/>
								{errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Password
								</label>
								<input
									type="password"
									name="password"
									value={formData.password}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									required
								/>
								{errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Confirm Password
								</label>
								<input
									type="password"
									name="confirmPassword"
									value={formData.confirmPassword}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									required
								/>
								{errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
							</div>

							{/* Password Strength */}
							{passwordStrength && (
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<div className="flex-1 bg-gray-200 rounded-full h-2">
											<div
												className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
												style={{ width: `${(passwordStrength.score + 1) * 20}%` }}
											/>
										</div>
										<span className="text-sm text-gray-600">{passwordStrength.message}</span>
									</div>
								</div>
							)}


					<button
						type="submit"
						disabled={isLoading}
						className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
					>
						{isLoading ? 'Sending code...' : 'Continue'}
					</button>
						</form>

						<div className="text-center">
							<button
								onClick={switchToLogin}
								className="text-blue-600 hover:text-blue-500 text-sm"
							>
								Already have an account? Sign in
							</button>
						</div>
					</div>
				);

			case 'verify':
				return (
					<div className="space-y-4">
						<div className="text-center">
							<h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
							<p className="text-gray-600">
								Verification code sent to <span className="font-medium text-blue-600">{formData.email}</span>.
								<span className="text-gray-500 text-sm mt-1 block">
									Check your spam folder if you don't see it.
								</span>
							</p>
						</div>

						<div className="text-center text-sm text-gray-600 mb-6">
							Didn't receive the code?{' '}
							<button
								type="button"
								onClick={handleResendCode}
								disabled={resendDisabled}
								className={`text-blue-600 hover:text-blue-800 font-medium ${resendDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
							>
								{resendDisabled ? `Resend in ${countdown}s` : 'Resend Code'}
							</button>
						</div>

				<form action={`${apiUrl}/api/v1/sso/signup`} method="POST" className="space-y-4">
					<input type="hidden" name="tenant_domain" value={tenantDomain} />
					<input type="hidden" name="email" value={formData.email} />
					<input type="hidden" name="password" value={formData.password} />
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Verification Code
								</label>
								<input
									type="text"
									name="verificationCode"
									value={formData.verificationCode}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
									placeholder="000000"
									maxLength={6}
									required
								/>
								{errors.verificationCode && <p className="text-red-500 text-sm mt-1">{errors.verificationCode}</p>}
							</div>

							<button
								type="submit"
								className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
							>
								Verify Email
							</button>
						</form>

						<div className="text-center">
							<button
								onClick={switchToSignup}
								className="text-blue-600 hover:text-blue-500 text-sm"
							>
								Back to Account Details
							</button>
						</div>
					</div>
				);

			default:
				return null;
		}
	};

	const modalContent = open && (
		<div className="fixed inset-0 z-[99999] flex items-center justify-center">
			{/* Backdrop */}
			<div 
				className="absolute inset-0 bg-black/50"
				onClick={() => setOpen(false)}
			/>
			
			{/* Modal Content */}
			<div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
				{/* Close Button */}
				<button
					onClick={() => setOpen(false)}
					className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
				>
					<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>

				{/* Modal Body */}
				<div className="p-6">
					{renderAuthForm()}
				</div>
			</div>
		</div>
	);

	return (
		<>
			<div id={id} style={style} className={className}>
				<div className="relative flex items-center" ref={dropdownRef}>
					{userInfo?.isAuthenticated ? (
						<>
							<button
								onClick={() => setMenuOpen(!menuOpen)}
								aria-label="Account"
							className="flex items-center justify-center rounded-md text-gray-700 hover:text-gray-900 bg-transparent"
							>
								{content ? (
								typeof content === 'string' ? (
									<span>{content}</span>
								) : (
									<>
										{content.icon && <span className="mr-2">{content.icon}</span>}
										<span>{content.text}</span>
									</>
								)
							) : (
								<UserIcon className="w-5 h-5" aria-hidden="true" />
							)}
							</button>
							{menuOpen && (
								<div className="absolute right-0 mt-8 w-40 top-[-5px] origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[100000]">
									<div className="py-1">
										<Link href="/account-settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
											My Account
										</Link>
									</div>
								</div>
							)}
						</>
					) : (
						<button
							onClick={() => setOpen(true)}
							aria-label="Open sign-in"
							className={`flex items-center justify-center rounded-md ${
								content 
									? 'w-full' 
									: 'bg-transparent text-gray-700 hover:text-gray-900'
							}`}
						>
							{content ? (
								typeof content === 'string' ? (
									<span>{content}</span>
								) : (
									<>
										{content.icon && <span className="mr-2">{content.icon}</span>}
										<span>{content.text}</span>
									</>
								)
							) : (
								<UserIcon className="w-5 h-5" aria-hidden="true" />
							)}
						</button>
					)}
				</div>
			</div>

			{/* Render modal as portal to document.body to avoid wrapper overflow issues */}
			{mounted && modalContent && createPortal(modalContent, document.body)}
		</>
	);
};

export default ModalButtonComponent;
