import React from 'react';
import { AtomNode } from './OSDL.types'; // Ensure OSDL.types is correctly pathed if AtomNode is used here

// Atom component imports - Assuming these files exist or will be created.
// If they don't exist, this will cause an error until they are created.
import TextAtom from './osdl/atoms/TextAtom'; 
import ButtonAtom from './osdl/atoms/ButtonAtom';
import ImageAtom from './osdl/atoms/ImageAtom';
import ProgressBarAtom from './osdl/atoms/ProgressBarAtom';
import VideoAtom from './osdl/atoms/VideoAtom';
import InputAtom from './osdl/atoms/InputAtom';
import LinkAtom from './osdl/atoms/LinkAtom';
import IconAtom from './osdl/atoms/IconAtom';
const ThreeJSSceneAtom = React.lazy(() => import('./osdl/atoms/ThreeJSSceneAtom'));

// Define a common props interface that all Atom Components will receive from NodeRenderer
// This includes standard OSDL node attributes and the specific params for the atom type spread into it.
export interface AtomComponentProps extends Record<string, any> { // extends Record<string, any> allows for spread params
  id: string;
  style?: React.CSSProperties;
  className?: string;
  nodeSchema: AtomNode; // Includes original params, atomType, etc.
  isBeingEdited?: boolean; // Prop to indicate text-edit mode
}

const AtomRegisty: Record<string, React.ComponentType<AtomComponentProps> | React.LazyExoticComponent<React.ComponentType<AtomComponentProps>>> = {
  'Text': TextAtom as React.ComponentType<AtomComponentProps>, 
  'Button': ButtonAtom as React.ComponentType<AtomComponentProps>,
  'Image': ImageAtom as React.ComponentType<AtomComponentProps>,
  'ProgressBar': ProgressBarAtom as React.ComponentType<AtomComponentProps>,
  'Video': VideoAtom as React.ComponentType<AtomComponentProps>,
  'Input': InputAtom as React.ComponentType<AtomComponentProps>,
  'Link': LinkAtom as React.ComponentType<AtomComponentProps>,
  'Icon': IconAtom as React.ComponentType<AtomComponentProps>,
  'ThreeJSScene': ThreeJSSceneAtom,
  // Add other atoms here as they are created
};

export default AtomRegisty;
