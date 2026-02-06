import React from 'react';

export const Button = ({ children, ...rest }: any) => {
  return (
    <button {...rest}>
      {children}
    </button>
  );
};
