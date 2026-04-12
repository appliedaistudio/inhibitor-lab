import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App'; // adjust path as needed
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function NextPage() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <TouchableOpacity
      style={styles.screen}
      onPress={() => navigation.navigate('StartQuiz')}
      activeOpacity={1}
    >
      <View style={styles.card}>
        <Text style={styles.text}>INFO</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#eceaf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#f0eef8',
    borderRadius: 32,
    width: 280,
    height: 480,
    borderWidth: 1.5,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Georgia',
    fontSize: 42,
    color: '#1a1a2e',
  },
});