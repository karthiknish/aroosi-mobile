import React from "react";
import ScreenContainer from "./ScreenContainer";
import { useTabBarHeight } from "@contexts/TabBarContext";

/**
 * Higher-order component that wraps a screen in `ScreenContainer`.
 * This guarantees safe-area handling and vertical scrolling without
 * editing every screen implementation.
 */
export default function withScreenContainer<P extends object>(
  Wrapped: React.ComponentType<P>,
  options: { showsVerticalScrollIndicator?: boolean } = {}
): React.ComponentType<P> {
  const { showsVerticalScrollIndicator = false } = options;

  const ComponentWithContainer: React.FC<P> = (props: P) => {
    const tabBarHeight = useTabBarHeight();
    return (
      <ScreenContainer
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        extraContentBottomPadding={tabBarHeight}
      >
        <Wrapped {...props} />
      </ScreenContainer>
    );
  };

  ComponentWithContainer.displayName = `withScreenContainer(${
    Wrapped.displayName || Wrapped.name || "Component"
  })`;
  return ComponentWithContainer as React.ComponentType<P>;
}
