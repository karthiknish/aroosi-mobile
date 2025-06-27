declare module 'expo-blur' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface BlurViewProps extends ViewProps {
    intensity?: number;
    tint?: 'light' | 'dark' | 'default';
  }

  export const BlurView: ComponentType<BlurViewProps>;
}

declare module 'expo-image-manipulator' {
  export interface ImageResult {
    uri: string;
    width: number;
    height: number;
  }

  export interface SaveOptions {
    compress?: number;
    format?: 'jpeg' | 'png';
    base64?: boolean;
  }

  export interface Action {
    resize?: {
      width?: number;
      height?: number;
    };
    crop?: {
      originX: number;
      originY: number;
      width: number;
      height: number;
    };
    rotate?: number;
    flip?: {
      vertical?: boolean;
      horizontal?: boolean;
    };
  }

  export function manipulateAsync(
    uri: string,
    actions?: Action[],
    saveOptions?: SaveOptions
  ): Promise<ImageResult>;

  export const FlipType: {
    Horizontal: 'horizontal';
    Vertical: 'vertical';
  };

  export const SaveFormat: {
    JPEG: 'jpeg';
    PNG: 'png';
  };
}