import React from 'react';
import { Text, TextProps } from 'react-native';
import { lightTheme } from '../../constants/Theme';
import { useTheme } from '../../contexts/ThemeContext';

interface TypographyProps extends TextProps {
  variant?: 
    | 'headingLarge' 
    | 'headingMedium' 
    | 'headingSmall' 
    | 'heading'
    | 'body' 
    | 'bodyMedium' 
    | 'bodySemiBold' 
    | 'bodyBold'
    | 'caption' 
    | 'captionMedium';
  color?: string;
  children: React.ReactNode;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color,
  style,
  children,
  ...props
}) => {
  const { theme } = useTheme();
  const textStyle = theme.components.text[variant] || theme.components.text.body;

  return (
    <Text
      style={[
        textStyle,
        color && { color },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

// Convenience components for common use cases
export const Heading1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="headingLarge" {...props} />
);

export const Heading2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="headingMedium" {...props} />
);

export const Heading3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="headingSmall" {...props} />
);

export const Heading4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="heading" {...props} />
);

export const BodyText: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body" {...props} />
);

export const BodyTextMedium: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="bodyMedium" {...props} />
);

export const BodyTextSemiBold: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="bodySemiBold" {...props} />
);

export const BodyTextBold: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="bodyBold" {...props} />
);

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" {...props} />
);

export const CaptionMedium: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="captionMedium" {...props} />
);

// Utility function to get text styles for use in StyleSheet.create
export const getTextStyle = (variant: TypographyProps['variant'] = 'body', theme = lightTheme) => {
  return theme.components.text[variant] || theme.components.text.body;
};

export default Typography;