import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type TabConfig = {
  name: string;
  title: string;
  icon: IconName;
  activeIcon: IconName;
};

const tabs: TabConfig[] = [
  { name: 'index',         title: 'Home',          icon: 'home-outline',         activeIcon: 'home' },
  { name: 'cart',          title: 'Cart',           icon: 'bag-outline',          activeIcon: 'bag' },
  { name: 'notifications', title: 'Notifications',  icon: 'notifications-outline', activeIcon: 'notifications' },
  { name: 'profile',       title: 'Profile',        icon: 'person-outline',       activeIcon: 'person' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.mutedFg,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
      }}>
      {tabs.map(({ name, title, icon, activeIcon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused, color, size }) => (
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Ionicons
                  name={focused ? activeIcon : icon}
                  size={22}
                  color={focused ? colors.coral : colors.mutedFg}
                />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    elevation: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  item: {
    gap: 2,
  },
  iconWrap: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  iconWrapActive: {
    backgroundColor: `${colors.coral}15`,
  },
});