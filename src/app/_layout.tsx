import { Slot, router, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { colors } from '../constants/theme';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const onAuthScreen = segments[0] === 'login' || segments[0] === 'register';
    if (!user && !onAuthScreen) router.replace('/login');
    else if (user && onAuthScreen) router.replace('/(tabs)');
  }, [user, loading, segments]);

  const { colors: themeColors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.cream }}>
        <ActivityIndicator size="large" color={themeColors.coral} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <RootLayoutNav />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}