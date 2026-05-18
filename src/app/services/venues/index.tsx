import { View, Text } from 'react-native';
import { colors } from '../../../constants/theme';

export default function VenuesScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream }}>
      <Text>Venues — coming soon</Text>
    </View>
  );
}