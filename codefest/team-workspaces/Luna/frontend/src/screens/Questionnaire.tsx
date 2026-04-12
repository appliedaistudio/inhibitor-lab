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
  ActivityIndicator,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

const questions = [
  { key: 'pain',                    text: 'Do you experience painful periods?' },
  { key: 'pain_with_sex',           text: 'Do you experience pain with sex?' },
  { key: 'pain_with_bowel',         text: 'Do you experience pain with bowel movements?' },
  { key: 'excessive_bleeding',      text: 'Do you experience excessive bleeding?' },
  { key: 'infertility',             text: 'Have you experienced infertility?' },
  { key: 'irregular_periods',       text: 'Do you have irregular periods?' },
  { key: 'fatigue',                 text: 'Do you experience fatigue?' },
  { key: 'unexplained_weight_gain', text: 'Do you experience unexplained weight gain?' },
];

const options = ['Never', 'Sometimes', 'Always'];

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Questionnaire() {
  const navigation = useNavigation<NavigationProp>();
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const questionOpacity = useRef(new Animated.Value(1)).current;
  const questionTranslateY = useRef(new Animated.Value(0)).current;

  const optionAnims = useRef(
    options.map(() => ({
      opacity: new Animated.Value(1),
      translateY: new Animated.Value(0),
    }))
  ).current;

  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.55] });
  const glowScale   = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] });

  const handleAnswer = async (option: string) => {
    if (animating) return;

    const newAnswers = { ...answers, [questions[current].key]: option.toLowerCase() };
    setAnswers(newAnswers);

    const isLast = current + 1 >= questions.length;

    setAnimating(true);

    // Exit animation
    Animated.parallel([
      Animated.timing(questionOpacity,    { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(questionTranslateY, { toValue: -14, duration: 280, useNativeDriver: true }),
      ...optionAnims.map(({ opacity, translateY }, i) =>
        Animated.parallel([
          Animated.timing(opacity,    { toValue: 0, duration: 260, delay: i * 30, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -10, duration: 260, delay: i * 30, useNativeDriver: true }),
        ])
      ),
    ]).start(async () => {
      if (isLast) {
        // Call backend
        setLoading(true);
        try {
          const body = {
            profile: {
              first_name: 'User',
              age: 25,
              weight: '60kg',
              height: '165cm',
              pregnant: false,
              activity_level: 'moderate',
            },
            screening: {
              fatigue:                  newAnswers['fatigue']                  || 'no',
              pain:                     newAnswers['pain']                     || 'no',
              irregular_periods:        newAnswers['irregular_periods']        || 'no',
              mood_changes:             'no',
              sleep_issues:             'no',
              appetite_changes:         'no',
              excessive_bleeding:       newAnswers['excessive_bleeding']       || 'no',
              unexplained_weight_gain:  newAnswers['unexplained_weight_gain']  || 'no',
            },
            location: 'Philadelphia',
          };

          const [analyzeRes, matchRes] = await Promise.all([
            fetch(`${API_URL}/analyze`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }),
            fetch(`${API_URL}/match`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }),
          ]);

          const analyzeData = await analyzeRes.json();
          const matchData   = await matchRes.json();
          navigation.navigate('Results', { analyzeData, matchData });
        } catch (e) {
          console.error(e);
          navigation.navigate('Results', { analyzeData: null, matchData: null });
        } finally {
          setLoading(false);
          setAnimating(false);
        }
        return;
      }

      // Not last — advance and animate in
      setCurrent(current + 1);
      questionTranslateY.setValue(18);
      questionOpacity.setValue(0);
      optionAnims.forEach(({ opacity, translateY }) => {
        opacity.setValue(0);
        translateY.setValue(14);
      });

      Animated.parallel([
        Animated.timing(questionOpacity,    { toValue: 1, duration: 340, useNativeDriver: true }),
        Animated.timing(questionTranslateY, { toValue: 0, duration: 340, useNativeDriver: true }),
        ...optionAnims.map(({ opacity, translateY }, i) =>
          Animated.parallel([
            Animated.timing(opacity,    { toValue: 1, duration: 320, delay: 40 + i * 50, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 320, delay: 40 + i * 50, useNativeDriver: true }),
          ])
        ),
      ]).start(() => setAnimating(false));
    });
  };

  const progress = (current / questions.length) * 100;

  if (loading) {
    return (
      <LinearGradient
        colors={['#f0ebff', '#fceef8', '#fff5fb', '#ffffff']}
        locations={[0, 0.4, 0.7, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.screen}
      >
        <ActivityIndicator size="large" color="#9b8fd4" />
        <Text style={styles.loadingText}>Luna is analyzing…</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#f0ebff', '#fceef8', '#fff5fb', '#ffffff']}
      locations={[0, 0.4, 0.7, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.screen}
    >
      <View style={styles.cardWrap}>

        {/* Breathing glow */}
        <Animated.View style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}>
          <LinearGradient
            colors={['transparent','rgba(196,176,232,0.28)','rgba(210,190,238,0.38)','rgba(196,176,232,0.28)','transparent']}
            locations={[0, 0.2, 0.5, 0.8, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 50 }]}
          />
        </Animated.View>

        {/* Card */}
        <LinearGradient
          colors={['rgba(255,255,255,0.88)', 'rgba(253,245,255,0.80)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.card}
        >
          <Text style={styles.tag}>Let's learn more about you</Text>
          <Text style={styles.heading}>A few questions</Text>

          <View style={styles.progressWrap}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <View style={styles.questionWrap}>
            <Animated.Text
              style={[styles.question, { opacity: questionOpacity, transform: [{ translateY: questionTranslateY }] }]}
            >
              {questions[current].text}
            </Animated.Text>
          </View>

          <View style={styles.optionsWrap}>
            {options.map((option, i) => (
              <Animated.View
                key={i}
                style={{ opacity: optionAnims[i].opacity, transform: [{ translateY: optionAnims[i].translateY }] }}
              >
                <TouchableOpacity style={styles.row} onPress={() => handleAnswer(option)} activeOpacity={0.8}>
                  <LinearGradient
                    colors={['#cfc0f0', '#a090d8']}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={styles.letterCircle}
                  >
                    <Text style={styles.letterText}>{String.fromCharCode(65 + i)}</Text>
                  </LinearGradient>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.92)', 'rgba(248,243,255,0.82)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.optionBox}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.counter}>{current + 1} of {questions.length}</Text>
            <View style={styles.dots}>
              {questions.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === current && styles.dotActive, i < current && styles.dotDone]}
                />
              ))}
            </View>
          </View>
        </LinearGradient>
      </View>
    </LinearGradient>
  );
}

const CARD_WIDTH = Math.min(width - 48, 360);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9b8fd4',
    marginTop: 16,
    fontSize: 14,
  },
  cardWrap: {
    width: CARD_WIDTH,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -18, left: -18, right: -18, bottom: -18,
    borderRadius: 50,
  },
  card: {
    borderRadius: 32,
    borderWidth: 0.5,
    borderColor: 'rgba(196,176,232,0.28)',
    padding: 36,
    paddingTop: 40,
  },
  tag: {
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#c4b0e8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heading: {
    fontSize: 22,
    fontWeight: '500',
    color: '#2d2650',
    marginBottom: 4,
    lineHeight: 30,
  },
  progressWrap: {
    backgroundColor: 'rgba(196,176,232,0.12)',
    borderRadius: 99,
    height: 3,
    marginTop: 22,
    marginBottom: 32,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#9b8fd4',
  },
  questionWrap: {
    minHeight: 56,
    marginBottom: 30,
    justifyContent: 'flex-start',
  },
  question: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2d2650',
    lineHeight: 24,
  },
  optionsWrap: {
    gap: 10,
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  letterCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  letterText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.95)',
  },
  optionBox: {
    flex: 1,
    borderRadius: 14,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(196,176,232,0.22)',
    paddingHorizontal: 18,
  },
  optionText: {
    fontSize: 13,
    color: '#7b6ab8',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: {
    fontSize: 12,
    color: '#c4b0e8',
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(196,176,232,0.2)',
  },
  dotActive: {
    backgroundColor: '#9b8fd4',
    transform: [{ scale: 1.3 }],
  },
  dotDone: {
    backgroundColor: 'rgba(155,143,212,0.38)',
  },
});