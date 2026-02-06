'use client';

import React from 'react';
import { Field, RendererProps } from '../../types';
import { defaultReader, defaultMutatorsCreator } from '../../utils';
import { BuildDefaultField } from '../../utils';

interface ImageFilters {
  brightness?: number;
  contrast?: number;
  saturate?: number;
  hueRotate?: number;
  grayscale?: number;
  sepia?: number;
  blur?: number;
}

// Individual filter fields using your existing components
export const brightnessField = BuildDefaultField({
  id: "brightness",
  type: "number",
  label: "Brightness",
  dataPath: "params.filters.brightness",
  interactionsInlineStyle: "brightness",
  rendererConfig: {
    dir: "row",
    className: "flex-1 min-w-0",
    min: 0,
    max: 2,
    step: 0.1,
    showSlider: true,
    unit: ""
  }
});

export const contrastField = BuildDefaultField({
  id: "contrast",
  type: "number",
  label: "Contrast",
  dataPath: "params.filters.contrast",
  interactionsInlineStyle: "contrast",
  rendererConfig: {
    dir: "row",
    className: "flex-1 min-w-0",
    min: 0,
    max: 2,
    step: 0.1,
    showSlider: true,
    unit: ""
  }
});

export const saturateField = BuildDefaultField({
  id: "saturate",
  type: "number",
  label: "Saturation",
  dataPath: "params.filters.saturate",
  interactionsInlineStyle: "saturate",
  rendererConfig: {
    dir: "row",
    className: "flex-1 min-w-0",
    min: 0,
    max: 2,
    step: 0.1,
    showSlider: true,
    unit: ""
  }
});

export const hueRotateField = BuildDefaultField({
  id: "hueRotate",
  type: "number",
  label: "Hue Rotate",
  dataPath: "params.filters.hueRotate",
  interactionsInlineStyle: "hueRotate",
  rendererConfig: {
    dir: "row",
    className: "flex-1 min-w-0",
    min: 0,
    max: 360,
    step: 1,
    showSlider: true,
    unit: "°"
  }
});

export const grayscaleField = BuildDefaultField({
  id: "grayscale",
  type: "number",
  label: "Grayscale",
  dataPath: "params.filters.grayscale",
  interactionsInlineStyle: "grayscale",
  rendererConfig: {
    dir: "row",
    className: "flex-1 min-w-0",
    min: 0,
    max: 1,
    step: 0.1,
    showSlider: true,
    unit: ""
  }
});

export const sepiaField = BuildDefaultField({
  id: "sepia",
  type: "number",
  label: "Sepia",
  dataPath: "params.filters.sepia",
  interactionsInlineStyle: "sepia",
  rendererConfig: {
    dir: "row",
    className: "flex-1 min-w-0",
    min: 0,
    max: 1,
    step: 0.1,
    showSlider: true,
    unit: ""
  }
});

export const blurField = BuildDefaultField({
  id: "blur",
  type: "number",
  label: "Blur",
  dataPath: "params.filters.blur",
  interactionsInlineStyle: "blur",
  rendererConfig: {
    dir: "row",
    className: "flex-1 min-w-0 pb-4",
    min: 0,
    max: 10,
    step: 0.1,
    showSlider: true,
    unit: "px",
    overridePositioning: {
      bottom: "16px" // Add 16px bottom spacing
    }
  }
});

