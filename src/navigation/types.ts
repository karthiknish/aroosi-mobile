export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  ProfileDetail: {
    profileId: string;
    userId?: string;
  };
};

export type MainTabParamList = {
  Search: undefined;
  Matches: undefined;
  Chat: undefined;
  ProfileTab: undefined;
  Premium: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  ProfileDetail: {
    profileId: string;
    userId?: string;
  };
  EditProfile: undefined;
  Settings: undefined;
  Subscription: undefined;
};

export type ChatStackParamList = {
  ConversationList: undefined;
  Chat: {
    conversationId: string;
    partnerName?: string;
    partnerId?: string;
  };
};

export type SearchStackParamList = {
  SearchMain: undefined;
  ProfileDetail: {
    profileId: string;
    userId?: string;
  };
};

export type MatchesStackParamList = {
  MatchesMain: undefined;
  ProfileDetail: {
    profileId: string;
    userId?: string;
  };
};

// Global navigation helper types
export type GlobalNavigationParamList = RootStackParamList & 
  MainTabParamList & 
  ProfileStackParamList & 
  ChatStackParamList &
  SearchStackParamList &
  MatchesStackParamList;