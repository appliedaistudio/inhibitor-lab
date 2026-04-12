import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { useRef, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

export default function StartQuiz() {
  const navigation = useNavigation<NavigationProp>();

  // Entrance anims
  const tagFade = useRef(new Animated.Value(0)).current;
  const headingFade = useRef(new Animated.Value(0)).current;
  const headingSlide = useRef(new Animated.Value(20)).current;
  const bodyFade = useRef(new Animated.Value(0)).current;
  const bodySlide = useRef(new Animated.Value(16)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(16)).current;

  // Orb breath anims
  const orb1Breath = useRef(new Animated.Value(0)).current;
  const orb2Breath = useRef(new Animated.Value(0)).current;
  const orb3Breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance
    Animated.stagger(120, [
      Animated.timing(tagFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(headingFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(headingSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(bodyFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(bodySlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(buttonFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(buttonSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();

    // Breathing orbs — each on its own slow, offset rhythm
    const breathe = (anim: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ])
      ).start();

    breathe(orb1Breath, 4200);
    breathe(orb2Breath, 5600);
    breathe(orb3Breath, 3800);
  }, []);

  const orb1Scale = orb1Breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const orb1Opacity = orb1Breath.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.22] });

  const orb2Scale = orb2Breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const orb2Opacity = orb2Breath.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.16] });

  const orb3Scale = orb3Breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const orb3Opacity = orb3Breath.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.14] });

  return (
    <LinearGradient
      colors={['#f0ebff', '#fceef8', '#fff5fb', '#ffffff']}
      locations={[0, 0.4, 0.7, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.screen}
    >
      {/* Orb 1 — top left, large, lavender */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          { opacity: orb1Opacity, transform: [{ scale: orb1Scale }] },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(196,176,232,0.9)',
            'rgba(210,190,240,0.4)',
            'rgba(220,200,245,0.1)',
            'transparent',
          ]}
          locations={[0, 0.35, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Orb 2 — bottom right, rose-lilac */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          { opacity: orb2Opacity, transform: [{ scale: orb2Scale }] },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(220,180,235,0.9)',
            'rgba(230,195,242,0.4)',
            'rgba(240,210,248,0.1)',
            'transparent',
          ]}
          locations={[0, 0.35, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Orb 3 — bottom left, soft purple */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb3,
          { opacity: orb3Opacity, transform: [{ scale: orb3Scale }] },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(180,160,225,0.9)',
            'rgba(200,180,235,0.4)',
            'rgba(215,200,242,0.1)',
            'transparent',
          ]}
          locations={[0, 0.35, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.content}>

        <Animated.Text style={[styles.tag, { opacity: tagFade }]}>
          Health check-in
        </Animated.Text>

        <Animated.Text
          style={[
            styles.heading,
            {
              opacity: headingFade,
              transform: [{ translateY: headingSlide }],
            },
          ]}
        >
          Let's learn more{'\n'}about you
        </Animated.Text>

        <Animated.View style={[styles.divider, { opacity: bodyFade }]} />

        <Animated.Text
          style={[
            styles.body,
            {
              opacity: bodyFade,
              transform: [{ translateY: bodySlide }],
            },
          ]}
        >
          This short questionnaire helps us understand your symptoms and
          tailor your experience. It only takes a couple of minutes.
        </Animated.Text>

        <Animated.View style={[styles.chipRow, { opacity: bodyFade }]}>
          {['9 questions', '2 minutes', 'Private & secure'].map((c) => (
            <View key={c} style={styles.chip}>
              <Text style={styles.chipText}>{c}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View
          style={{
            opacity: buttonFade,
            transform: [{ translateY: buttonSlide }],
            width: '100%',
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate('Questionnaire')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#cfc0f0', '#9b8fd4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Begin check-in</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Animated.Text style={[styles.hint, { opacity: buttonFade }]}>
          Your responses are always private
        </Animated.Text>

      </View>
    </LinearGradient>
  );
}

const ORB_SIZE = width * 1.1;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
  },
  orb1: {
    top: -ORB_SIZE * 0.42,
    left: -ORB_SIZE * 0.28,
  },
  orb2: {
    bottom: -ORB_SIZE * 0.38,
    right: -ORB_SIZE * 0.3,
  },
  orb3: {
    bottom: -ORB_SIZE * 0.5,
    left: -ORB_SIZE * 0.1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 36,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  tag: {
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#c4b0e8',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  heading: {
    fontSize: 38,
    fontWeight: '500',
    color: '#2d2650',
    lineHeight: 48,
    marginBottom: 28,
  },
  divider: {
    height: 3,
    width: 40,
    borderRadius: 99,
    backgroundColor: 'rgba(196,176,232,0.4)',
    marginBottom: 24,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: '#6b5f99',
    marginBottom: 28,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 40,
  },
  chip: {
    backgroundColor: 'rgba(196,176,232,0.15)',
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(196,176,232,0.35)',
  },
  chipText: {
    fontSize: 12,
    color: '#9b8fd4',
  },
  button: {
    borderRadius: 99,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: 12,
    color: '#c4b0e8',
    textAlign: 'center',
  },
});