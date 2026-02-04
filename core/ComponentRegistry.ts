import React from 'react';
import { ComponentNode } from './OSDL.types';
// Import your pre-built React components that correspond to OSDL componentTypes

// Example:
// import NavbarComponent from './osdl/components/NavbarComponent'; 
// import FooterComponent from './osdl/components/FooterComponent';
import CallToActionComponent from './osdl/components/CallToActionComponent';
import HeroComponent from './osdl/components/HeroComponent';
import NavbarComponent from './osdl/components/NavbarComponent';
import { SimpleComponent } from './osdl/components/Simple';
import ModalButtonComponent from './osdl/components/ModalButtonComponent';
import CheckoutComponent from './osdl/components/CheckoutComponent';
import UserSettingsComponent from './osdl/components/UserSettingsComponent';
import CartComponent from './osdl/components/CartComponent';
import ProductPageComponent from './osdl/components/ProductPageComponent';

export interface ComponentComponentProps extends Record<string, any> {
  id: string;
  style?: React.CSSProperties;
  className?: string;
  nodeSchema: ComponentNode; // Pass the full schema for context
}

/**
 * Maps OSDL componentType strings to actual React components.
 * The NodeRenderer uses this to instantiate the correct component based on the schema.
 */
const ComponentRegistry: Record<string, React.ComponentType<any>> = {
  // Example built-in components (you would create these actual React components)
  // 'Navbar': NavbarComponent,
  // 'Footer': FooterComponent,
  // 'ProductGrid': ProductGridComponent, 
  // 'TestimonialSlider': TestimonialSliderComponent,
  
  'CallToAction': CallToActionComponent,
  'Hero': HeroComponent,
  'Navbar': NavbarComponent,
  'Simple': SimpleComponent,
  'ModalButton': ModalButtonComponent,
  'UserSettings': UserSettingsComponent,
  'Checkout': CheckoutComponent,
  'Cart': CartComponent,
  'ProductPage': ProductPageComponent,
  // Add other custom components here
};


export default ComponentRegistry;
