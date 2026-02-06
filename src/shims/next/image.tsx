import React from 'react';

const Image = ({ src, alt, ...rest }: any) => {
  return <img src={src} alt={alt || ''} {...rest} />;
};

export default Image;
