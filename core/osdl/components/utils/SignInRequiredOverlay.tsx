'use client';

import React from 'react';

interface SignInRequiredOverlayProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Full-screen overlay used in editor when a page requires an authenticated user.
 * Place it inside a relatively positioned container so it can cover the skeleton underneath.
 * The skeleton/layout should be provided by the caller; this overlay only renders the blur + message.
 */
const SignInRequiredOverlay: React.FC<SignInRequiredOverlayProps> = ({ className, style }) => {
  return (
    <div
      className={`absolute inset-0 backdrop-blur-sm bg-white/50 flex items-center justify-center z-10 ${className || ''}`}
      style={style}
    >
      <div className="text-center max-w-lg mx-auto p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Sign-in required to preview</h3>
        <p className="text-sm text-gray-700 mb-4">
          To preview this page, switch to <span className="font-medium">User mode</span> from the top bar.
        </p>
        <p className="text-sm text-gray-700">
          On the website, this page is only shown to signed‑in users. Guests are automatically redirected.
        </p>
      </div>
    </div>
  );
};

export default SignInRequiredOverlay;


