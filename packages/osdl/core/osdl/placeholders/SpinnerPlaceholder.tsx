'use client';

import React from 'react';
import './placeholders.css'; // For any shared styles if needed in future

interface SpinnerPlaceholderProps {
  style?: React.CSSProperties;
  className?: string;
  spinnerColor?: string; }

const SpinnerPlaceholder: React.FC<SpinnerPlaceholderProps> = ({
  style,
  className,
  spinnerColor,
}) => {
  const effectiveSpinnerColor = spinnerColor || 'var(--primary, #007bff)';

  const spinnerStyle: React.CSSProperties = {
    display: 'inline-block',
    width: style?.width || style?.height || '40px',
    height: style?.height || style?.width || '40px',
    border: `4px solid ${effectiveSpinnerColor}33`, // Lighter shade for the track
    borderTopColor: effectiveSpinnerColor,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    ...style,
  };

  // Keyframes for spin animation - will be injected dynamically
  const keyframes = `
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  return (
    <>
      <style>{keyframes}</style>
      <div style={spinnerStyle} className={className || ''} role="status" aria-label="Loading...">
        {/* Visually hidden text for accessibility if needed, but role="status" and aria-label should suffice */}
        {/* <span style={{ display: 'none' }}>Loading...</span> */}
      </div>
    </>
  );
};

export default SpinnerPlaceholder; 
