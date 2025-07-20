// Global type declarations for the messaging system

declare global {
  var __messagingDailyCount:
    | {
        count: number;
        date: string;
      }
    | undefined;

  var localStorage:
    | {
        getItem: (key: string) => string | null;
        setItem: (key: string, value: string) => void;
        removeItem: (key: string) => void;
      }
    | undefined;

  interface Window {
    __messagingDailyCount?: {
      count: number;
      date: string;
    };
  }
}

export {};
