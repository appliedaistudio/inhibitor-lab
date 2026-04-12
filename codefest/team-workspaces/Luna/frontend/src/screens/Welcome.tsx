import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';


type NavigationProp = NativeStackNavigationProp<RootStackParamList>;


export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const tapOpacity = useRef(new Animated.Value(0)).current;
  const orbScale = useRef(new Animated.Value(1)).current;


  useEffect(() => {
    setTimeout(() => {
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }).start();
    }, 1500);
    setTimeout(() => {
      Animated.timing(tapOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(orbScale, { toValue: 1.04, duration: 1250, useNativeDriver: true }),
            Animated.timing(orbScale, { toValue: 1, duration: 1250, useNativeDriver: true }),
          ])
        ).start();
      });
    }, 3000);
  }, []);


  return (
    <TouchableOpacity
      style={styles.screen}
      onPress={() => navigation.navigate('IntroDisplay')}
      activeOpacity={1}
    >
      {/* Orb section */}
      <View style={styles.orbContainer}>
        <Animated.View style={[styles.orbWrapper, { transform: [{ scale: orbScale }] }]}>
          <View style={styles.halo} />
          <View style={styles.ring1} />
          <View style={styles.ring2} />
          <LinearGradient
            colors={['#e8e0f8', '#d4c8f0', '#c8b8ef', '#b8a8e8', '#a090d8']}
            start={{ x: 0.2, y: 0.1 }}
            end={{ x: 0.9, y: 0.9 }}
            style={styles.orbGradient}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.6)', 'rgba(220,210,255,0.2)', 'transparent']}
              start={{ x: 0.1, y: 0.05 }}
              end={{ x: 0.6, y: 0.6 }}
              style={styles.orbHighlight}
            />
            <LinearGradient
              colors={['transparent', 'rgba(240,180,220,0.35)', 'transparent']}
              start={{ x: 0.5, y: 0.4 }}
              end={{ x: 1.0, y: 1.0 }}
              style={styles.orbPinkAccent}
            />
            <LinearGradient
              colors={['transparent', 'rgba(180,200,255,0.3)', 'transparent']}
              start={{ x: 0.0, y: 0.6 }}
              end={{ x: 0.5, y: 1.0 }}
              style={styles.orbBlueAccent}
            />
          </LinearGradient>
        </Animated.View>
      </View>


      {/* Text section */}
      <View style={styles.textSection}>
        <View style={styles.titleGroup}>
          <Text style={styles.welcome}>Welcome</Text>
          <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
            to Luna Women's Health
          </Animated.Text>
          <Animated.Text style={[styles.tap, { opacity: tapOpacity }]}>
            Tap to Continue
          </Animated.Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}


const ORB_SIZE = 260;
const RING1_SIZE = ORB_SIZE + 30;
const RING2_SIZE = ORB_SIZE + 60;
const HALO_SIZE = ORB_SIZE + 100;


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f0eef8',
    flexDirection: 'column',
  },
  orbContainer: {
    flex: 6,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  orbWrapper: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    backgroundColor: 'rgba(200,180,255,0.12)',
  },
  ring1: {
    position: 'absolute',
    width: RING2_SIZE,
    height: RING2_SIZE,
    borderRadius: RING2_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(220,210,255,0.4)',
  },
  ring2: {
    position: 'absolute',
    width: RING1_SIZE,
    height: RING1_SIZE,
    borderRadius: RING1_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  orbGradient: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
  },
  orbHighlight: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
  },
  orbPinkAccent: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
  },
  orbBlueAccent: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
  },
  textSection: {
    flex: 4,
    alignItems: 'center',
    backgroundColor: '#f0eef8',
    paddingTop: 24,
  },
  titleGroup: {
    alignItems: 'center',
    gap: 8,
  },
  welcome: {
    fontFamily: 'Georgia',
    fontSize: 58,
    color: '#1a1a2e',
  },
  subtitle: {
    fontFamily: 'Georgia',
    fontSize: 24,
    color: '#5a5070',
  },
  tap: {
  fontFamily: 'Georgia',
  fontSize: 16,
  color: '#1a1a2e',
  marginTop: 20,
},
});
