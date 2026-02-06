import React from 'react';
import { ComponentNode } from './OSDL.types';

import CallToActionComponent from './osdl/components/CallToActionComponent';
import HeroComponent from './osdl/components/HeroComponent';
import NavbarComponent from './osdl/components/NavbarComponent';
import { SimpleComponent } from './osdl/components/Simple';
import ModalButtonComponent from './osdl/components/ModalButtonComponent';

export interface ComponentComponentProps extends Record<string, any> {
  id: string;
  style?: React.CSSProperties;
  className?: string;
  nodeSchema: ComponentNode;
}

const Placeholder: React.FC<{ nodeSchema?: ComponentNode }> = ({ nodeSchema }) => {
  return (
    <div style={{ padding: 12, border: '1px dashed #ccc', color: '#666' }}>
      Unsupported component: {nodeSchema?.componentType || 'Unknown'}
    </div>
  );
};

const ComponentRegistry: Record<string, React.ComponentType<any>> = {
  CallToAction: CallToActionComponent,
  Hero: HeroComponent,
  Navbar: NavbarComponent,
  Simple: SimpleComponent,
  ModalButton: ModalButtonComponent,
  UserSettings: Placeholder,
  Checkout: Placeholder,
  Cart: Placeholder,
  ProductPage: Placeholder,
};

export default ComponentRegistry;
