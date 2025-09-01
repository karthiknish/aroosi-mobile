import React, { createContext, useContext } from "react";

type TabBarContextValue = number; // height in pixels

const TabBarContext = createContext<TabBarContextValue>(0);

export function TabBarProvider({
  height,
  children,
}: {
  height: number;
  children: React.ReactNode;
}) {
  return (
    <TabBarContext.Provider value={height}>{children}</TabBarContext.Provider>
  );
}

export function useTabBarHeight(): number {
  return useContext(TabBarContext);
}
