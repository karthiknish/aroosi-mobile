import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Switch,
} from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useState } from 'react';

interface SettingsScreenProps {
  navigation: any;
}

interface SettingItem {
  title: string;
  subtitle?: string;
  type: 'navigation' | 'toggle' | 'action';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  icon?: string;
  destructive?: boolean;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { signOut } = useAuth();
  const { user } = useUser();
  
  // Local state for toggles
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              navigation.navigate('Auth');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure you want to delete your account? This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: () => {
                    // TODO: Implement account deletion
                    Alert.alert('Info', 'Account deletion feature will be implemented soon.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const settingSections = [
    {
      title: 'Account',
      items: [
        {
          title: 'Edit Profile',
          subtitle: 'Update your personal information',
          type: 'navigation' as const,
          onPress: () => navigation.navigate('EditProfile'),
        },
        {
          title: 'Subscription',
          subtitle: 'Manage your premium features',
          type: 'navigation' as const,
          onPress: () => navigation.navigate('Subscription'),
        },
        {
          title: 'Privacy Settings',
          subtitle: 'Control who can see your profile',
          type: 'navigation' as const,
          onPress: () => navigation.navigate('Privacy'),
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          title: 'Push Notifications',
          subtitle: 'Receive notifications on your device',
          type: 'toggle' as const,
          value: pushNotifications,
          onToggle: setPushNotifications,
        },
        {
          title: 'Email Notifications',
          subtitle: 'Receive notifications via email',
          type: 'toggle' as const,
          value: emailNotifications,
          onToggle: setEmailNotifications,
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          title: 'Show Online Status',
          subtitle: 'Let others see when you\'re online',
          type: 'toggle' as const,
          value: showOnlineStatus,
          onToggle: setShowOnlineStatus,
        },
        {
          title: 'Read Receipts',
          subtitle: 'Let others see when you\'ve read their messages',
          type: 'toggle' as const,
          value: readReceipts,
          onToggle: setReadReceipts,
        },
        {
          title: 'Blocked Users',
          subtitle: 'Manage your blocked users list',
          type: 'navigation' as const,
          onPress: () => navigation.navigate('BlockedUsers'),
        },
      ],
    },
    {
      title: 'Safety & Support',
      items: [
        {
          title: 'Safety Center',
          subtitle: 'Report issues and safety concerns',
          type: 'navigation' as const,
          onPress: () => navigation.navigate('Safety'),
        },
        {
          title: 'Contact Support',
          subtitle: 'Get help from our support team',
          type: 'action' as const,
          onPress: () => {
            Alert.alert(
              'Contact Support',
              'Please email us at support@aroosi.com or use the in-app chat feature.',
              [{ text: 'OK' }]
            );
          },
        },
        {
          title: 'Terms of Service',
          subtitle: 'Read our terms and conditions',
          type: 'action' as const,
          onPress: () => {
            Alert.alert('Info', 'Terms of Service will open in browser.');
          },
        },
        {
          title: 'Privacy Policy',
          subtitle: 'Learn how we protect your data',
          type: 'action' as const,
          onPress: () => {
            Alert.alert('Info', 'Privacy Policy will open in browser.');
          },
        },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        {
          title: 'Sign Out',
          type: 'action' as const,
          onPress: handleSignOut,
        },
        {
          title: 'Delete Account',
          subtitle: 'Permanently delete your account',
          type: 'action' as const,
          onPress: handleDeleteAccount,
          destructive: true,
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem, index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.settingItem,
        item.destructive && styles.destructiveItem,
      ]}
      onPress={item.onPress}
      disabled={item.type === 'toggle'}
    >
      <View style={styles.settingContent}>
        <Text style={[
          styles.settingTitle,
          item.destructive && styles.destructiveText,
        ]}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      
      {item.type === 'toggle' && (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{ false: '#767577', true: '#007AFF' }}
          thumbColor="#fff"
        />
      )}
      
      {item.type === 'navigation' && (
        <Text style={styles.chevron}>›</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitial}>
              {user?.firstName?.charAt(0) || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.userEmail}>
            {user?.primaryEmailAddress?.emailAddress}
          </Text>
        </View>

        {/* Settings Sections */}
        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => renderSettingItem(item, itemIndex))}
            </View>
          </View>
        ))}

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Aroosi Mobile v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 50,
  },
  userInfo: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginHorizontal: 20,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  destructiveItem: {
    // Additional styling for destructive items if needed
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  destructiveText: {
    color: '#dc3545',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  chevron: {
    fontSize: 20,
    color: '#c7c7cc',
    marginLeft: 8,
  },
  versionContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#666',
  },
});