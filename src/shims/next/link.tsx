import React from 'react';

const Link = ({ href, children, ...rest }: any) => {
  const to = typeof href === 'string' ? href : href?.pathname || '/';
  return (
    <a href={to} {...rest}>
      {children}
    </a>
  );
};

export default Link;
