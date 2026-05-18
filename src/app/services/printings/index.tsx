import { View, Text } from 'react-native';
import { colors } from '../../../constants/theme';

export default function PrintingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream }}>
      <Text>Catering — coming soon</Text>
    </View>
  );
}