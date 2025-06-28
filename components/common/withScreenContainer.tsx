import React from "react";
import ScreenContainer from "./ScreenContainer";

/**
 * Higher-order component that wraps a screen in `ScreenContainer`.
 * This guarantees safe-area handling and vertical scrolling without
 * editing every screen implementation.
 */
export default function withScreenContainer<P>(
  Wrapped: React.ComponentType<P>,
  options: { showsVerticalScrollIndicator?: boolean } = {}
) {
  const { showsVerticalScrollIndicator = false } = options;

  const ComponentWithContainer: React.FC<P> = (props) => (
    <ScreenContainer
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
    >
      <Wrapped {...props} />
    </ScreenContainer>
  );

  ComponentWithContainer.displayName = `withScreenContainer(${
    Wrapped.displayName || Wrapped.name || "Component"
  })`;
  return ComponentWithContainer;
}
