import React, { useEffect } from 'react';

const Script = ({ src }: { src: string }) => {
  useEffect(() => {
    if (!src) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [src]);
  return null;
};

export default Script;
