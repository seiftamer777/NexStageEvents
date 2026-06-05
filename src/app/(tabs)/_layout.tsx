import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type TabConfig = {
  name: string;
  title: string;
  icon: IconName;
  activeIcon: IconName;
};

const tabs: TabConfig[] = [
  { name: 'index',         title: 'Home',   icon: 'home-outline',    activeIcon: 'home' },
  { name: 'cart',          title: 'Cart',   icon: 'bag-outline',     activeIcon: 'bag' },
  { name: 'notifications', title: 'Orders', icon: 'receipt-outline', activeIcon: 'receipt' },
  { name: 'profile',       title: 'Profile',icon: 'person-outline',  activeIcon: 'person' },
];

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          elevation: 0,
        },
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
            tabBarIcon: ({ focused }) => (
              <View style={[
                styles.iconWrap,
                focused && { backgroundColor: `${colors.coral}15` },
              ]}>
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
  label: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  item: { gap: 2 },
  iconWrap: {
    width: 40, height: 32,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.full,
  },
});
