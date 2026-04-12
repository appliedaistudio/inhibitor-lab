import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { useRef, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ResultsRouteProp = RouteProp<RootStackParamList, 'Results'>;

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - 48, 360);

export default function Results() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ResultsRouteProp>();
  const { analyzeData, matchData } = (route.params as any) || {};

  const glowAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.55] });
  const glowScale   = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] });

  const riskColor = ({ low: '#4caf50', medium: '#ff9800', high: '#f44336' } as any)[
    analyzeData?.risk_level
  ] || '#9b8fd4';

  return (
    <LinearGradient
      colors={['#f0ebff', '#fceef8', '#fff5fb', '#ffffff']}
      locations={[0, 0.4, 0.7, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.screen}
    >
      {/* Floating top nav */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('StartQuiz')}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonText}>← Retake Quiz</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonText}>Dashboard →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.cardWrap,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Breathing glow */}
          <Animated.View
            style={[
              styles.glow,
              { opacity: glowOpacity, transform: [{ scale: glowScale }] },
            ]}
          >
            <LinearGradient
              colors={[
                'transparent',
                'rgba(196,176,232,0.28)',
                'rgba(210,190,238,0.38)',
                'rgba(196,176,232,0.28)',
                'transparent',
              ]}
              locations={[0, 0.2, 0.5, 0.8, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 50 }]}
            />
          </Animated.View>

          {/* Main card */}
          <LinearGradient
            colors={['rgba(255,255,255,0.88)', 'rgba(253,245,255,0.80)']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.tag}>Your personalized results</Text>
            <Text style={styles.heading}>Here's what we found</Text>
            <View style={styles.divider} />

            {/* AI Summary */}
            <Text style={styles.sectionLabel}>AI SUMMARY</Text>
            <Text style={styles.body}>
              {analyzeData?.insight || 'No insight available. Please try again.'}
            </Text>

            <View style={styles.divider} />

            {/* Risk Level */}
            <Text style={styles.sectionLabel}>RISK LEVEL</Text>
            <Text style={[styles.riskText, { color: riskColor }]}>
              {analyzeData?.risk_level?.toUpperCase() || 'UNKNOWN'}
            </Text>
            {analyzeData?.flagged && (
              <View style={styles.flagBox}>
                <Text style={styles.flagText}>
                  ⚠️ Our safety system flagged this response. Please consult a healthcare provider.
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Sentiment */}
            <Text style={styles.sectionLabel}>EMOTIONAL HEALTH</Text>
            <View style={styles.pillRow}>
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>Tone</Text>
                <Text style={styles.pillValue}>
                  {analyzeData?.sentiment?.label || '—'}
                </Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>Intensity</Text>
                <Text style={styles.pillValue}>
                  {analyzeData?.sentiment?.intensity || '—'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Community Matches */}
            <Text style={styles.sectionLabel}>COMMUNITY MATCHES</Text>
            <Text style={styles.body}>
              {matchData?.match_summary || 'No matches found.'}
            </Text>

            {matchData?.matches?.slice(0, 3).map((m: any, i: number) => (
              <View key={i} style={styles.matchRow}>
                <Text style={styles.matchName}>
                  {m.first_name}, {m.age}
                </Text>
                <LinearGradient
                  colors={['#cfc0f0', '#9b8fd4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.matchBadge}
                >
                  <Text style={styles.matchScore}>
                    {Math.round(m.similarity_score * 100)}% match
                  </Text>
                </LinearGradient>
              </View>
            ))}

            <View style={{ height: 28 }} />

            {/* Retake quiz */}
            <TouchableOpacity
              onPress={() => navigation.navigate('StartQuiz')}
              activeOpacity={0.8}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Retake Quiz</Text>
            </TouchableOpacity>

            <View style={{ height: 12 }} />

            {/* Go to dashboard */}
            <TouchableOpacity
              onPress={() =>
                navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
              }
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#cfc0f0', '#9b8fd4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Go to Dashboard</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 8,
  },
  navButton: {
    backgroundColor: 'rgba(196,176,232,0.15)',
    borderRadius: 99,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(196,176,232,0.35)',
  },
  navButtonText: {
    fontSize: 12,
    color: '#9b8fd4',
    fontWeight: '500',
  },
  scroll: {
    alignItems: 'center',
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  cardWrap: {
    width: CARD_WIDTH,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -18,
    left: -18,
    right: -18,
    bottom: -18,
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
    lineHeight: 30,
  },
  divider: {
    height: 1,
    borderRadius: 99,
    backgroundColor: 'rgba(196,176,232,0.2)',
    marginVertical: 20,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#c4b0e8',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6b5f99',
  },
  riskText: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: 1,
  },
  flagBox: {
    marginTop: 10,
    backgroundColor: 'rgba(244,67,54,0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(244,67,54,0.2)',
  },
  flagText: {
    fontSize: 13,
    color: '#f44336',
    lineHeight: 20,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    flex: 1,
    backgroundColor: 'rgba(196,176,232,0.1)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(196,176,232,0.25)',
  },
  pillLabel: {
    fontSize: 10,
    color: '#c4b0e8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  pillValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2d2650',
    textTransform: 'capitalize',
  },
  matchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  matchName: {
    fontSize: 14,
    color: '#6b5f99',
  },
  matchBadge: {
    borderRadius: 99,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  matchScore: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '500',
  },
  secondaryButton: {
    borderRadius: 99,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196,176,232,0.5)',
    backgroundColor: 'rgba(196,176,232,0.08)',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9b8fd4',
    letterSpacing: 0.3,
  },
  button: {
    borderRadius: 99,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.3,
  },
});