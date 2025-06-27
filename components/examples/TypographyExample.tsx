import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Typography, Heading1, Heading2, Heading3, BodyText, BodyTextMedium, BodyTextBold, Caption } from '../ui/Typography';
import { typography, components } from '../../utils/styleGuide';
import { Colors, Layout } from '../../constants';

// Example component showing proper font and theme usage
export const TypographyExample: React.FC = () => {
  return (
    <ScrollView style={components.container}>
      <View style={components.section}>
        
        {/* Using Typography Components */}
        <View style={components.card}>
          <Heading1>Boldonse Heading 1</Heading1>
          <Heading2>Boldonse Heading 2</Heading2>
          <Heading3>Boldonse Heading 3</Heading3>
          
          <BodyText>This is regular body text using Nunito Sans Regular.</BodyText>
          <BodyTextMedium>This is medium body text using Nunito Sans Medium.</BodyTextMedium>
          <BodyTextBold>This is bold body text using Nunito Sans Bold.</BodyTextBold>
          
          <Caption>This is caption text using Nunito Sans Regular.</Caption>
        </View>

        {/* Using Style Guide Directly */}
        <View style={[components.card, { marginTop: Layout.spacing.lg }]}>
          <Text style={typography.h1}>Direct Style Guide H1</Text>
          <Text style={typography.h2}>Direct Style Guide H2</Text>
          <Text style={typography.body}>Direct style guide body text</Text>
          <Text style={typography.caption}>Direct style guide caption</Text>
        </View>

        {/* Theme Colors Example */}
        <View style={[components.cardAccent, { marginTop: Layout.spacing.lg }]}>
          <Text style={[typography.h2, { color: Colors.primary[500] }]}>
            Primary Color Heading
          </Text>
          <Text style={[typography.body, { color: Colors.secondary[500] }]}>
            Secondary color body text
          </Text>
          <Text style={[typography.caption, { color: Colors.accent[500] }]}>
            Accent color caption
          </Text>
        </View>

      </View>
    </ScrollView>
  );
};

// Example of how to update existing component styles
export const exampleStyles = StyleSheet.create({
  // OLD WAY (inconsistent)
  oldHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  oldBodyText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },

  // NEW WAY (consistent with theme)
  newHeaderTitle: {
    ...typography.h1,
    color: Colors.text.primary,
  },
  newBodyText: {
    ...typography.body,
    color: Colors.text.primary,
  },
  
  // You can also override specific properties
  customHeading: {
    ...typography.h2,
    color: Colors.primary[500], // Custom color
    textAlign: 'center',
  },
});

export default TypographyExample;