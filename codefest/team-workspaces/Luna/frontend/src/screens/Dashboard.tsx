import React, { useRef } from 'react';
import {
  View, Text, ScrollView, Animated,
  StyleSheet, Dimensions, StatusBar, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';


const { width, height } = Dimensions.get('window');


type FadeSectionProps = {
  children: React.ReactNode;
  scrollY: Animated.Value;
  triggerAt: number;
};
function FadeSection({ children, scrollY, triggerAt }: FadeSectionProps) {
  const opacity = scrollY.interpolate({
    inputRange: [triggerAt - 60, triggerAt + 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const translateY = scrollY.interpolate({
    inputRange: [triggerAt - 60, triggerAt + 80],
    outputRange: [30, 0],
    extrapolate: 'clamp',
  });
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}


export default function DashboardScreen() {
  const scrollY = useRef(new Animated.Value(0)).current;


  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, -60],
    extrapolate: 'clamp',
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });


  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />


      <LinearGradient
        colors={['#f5f0ff', '#fdf0f8', '#ffffff']}
        style={StyleSheet.absoluteFill}
      />


      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="normal"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >


        {/* ── Hero greeting header ── */}
        <Animated.View style={{
          transform: [{ translateY: headerTranslate }],
          opacity: headerOpacity,
          paddingHorizontal: 28,
          paddingTop: 60,
          paddingBottom: 32,
        }}>
          <Text style={styles.greeting}>Good morning</Text>
          <Text style={styles.name}>your health</Text>
          <Text style={styles.subtext}>Here's your daily check-in</Text>
        </Animated.View>


        {/* ── Check-in sliders ── */}
        <FadeSection scrollY={scrollY} triggerAt={20}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How are you feeling today?</Text>
            <Text style={styles.sectionSub}>Drag each bar to log your levels</Text>
            {[
              { label: 'Mood', low: 'Low', high: 'Great' },
              { label: 'Pain', low: 'None', high: 'Severe' },
              { label: 'Sleep quality', low: 'Poor', high: 'Great' },
              { label: 'Fatigue', low: 'None', high: 'Exhausted' },
            ].map((item) => (
              <View key={item.label} style={styles.sliderCard}>
                <View style={styles.sliderRow}>
                  <Text style={styles.sliderLabel}>{item.label}</Text>
                </View>
                <Slider
                  minimumValue={0}
                  maximumValue={100}
                  minimumTrackTintColor="#b8a9e8"
                  maximumTrackTintColor="#e8e0f8"
                  thumbTintColor="#9b8fd4"
                  style={{ marginVertical: 6 }}
                />
                <View style={styles.sliderEnds}>
                  <Text style={styles.sliderEnd}>{item.low}</Text>
                  <Text style={styles.sliderEnd}>{item.high}</Text>
                </View>
              </View>
            ))}
          </View>
        </FadeSection>


        <LinearGradient
          colors={['transparent', '#ede8fb', 'transparent']}
          style={styles.sectionDivider}
        />


        {/* ── AI Summary ── */}
        <FadeSection scrollY={scrollY} triggerAt={320}>
          <View style={styles.section}>
            <Text style={styles.aiTag}>AI SUMMARY</Text>
            <Text style={styles.aiHeading}>This week's overview</Text>
            <Text style={styles.aiBody}>
              Your patterns this week suggest your body is in a recovery
              phase. Energy dips are consistent with normal variation.
              You're doing well staying on top of your check-ins.
            </Text>
          </View>
        </FadeSection>


        <LinearGradient
          colors={['transparent', '#ede8fb', 'transparent']}
          style={styles.sectionDivider}
        />


        {/* ── Dashboard ── */}
        <FadeSection scrollY={scrollY} triggerAt={520}>
          <View style={styles.section}>
            <Text style={styles.aiTag}>YOUR INSIGHTS</Text>
            <Text style={styles.aiHeading}>Dashboard</Text>
            <TouchableOpacity>
              <Text style={styles.insightsLink}>Click here to view your insights</Text>
            </TouchableOpacity>
          </View>
        </FadeSection>


        <LinearGradient
          colors={['transparent', '#f5e8f5', 'transparent']}
          style={styles.sectionDivider}
        />


        {/* ── Risk Analysis ── */}
        <FadeSection scrollY={scrollY} triggerAt={820}>
          <View style={styles.section}>
            <Text style={styles.aiTag}>RISK ANALYSIS</Text>
            <Text style={styles.aiHeading}>Things worth knowing</Text>
            {[
              'Recurring fatigue patterns may be worth discussing with your doctor',
              'Sleep consistency has improved compared to last month',
              'No significant mood irregularities flagged this week',
            ].map((item, i) => (
              <View key={i} style={styles.riskRow}>
                <View style={styles.riskDot} />
                <Text style={styles.aiBody}>{item}</Text>
              </View>
            ))}
          </View>
        </FadeSection>


        <LinearGradient
          colors={['transparent', '#ede8fb', 'transparent']}
          style={styles.sectionDivider}
        />


        {/* ── Recommendations ── */}
        <FadeSection scrollY={scrollY} triggerAt={1120}>
          <View style={[styles.section, { paddingBottom: 60 }]}>
            <Text style={styles.aiTag}>RECOMMENDATIONS</Text>
            <Text style={styles.aiHeading}>Personalized for you</Text>
            <Text style={styles.aiBody}>
              Based on your logs, here are a few things that may help
              you feel better this week.
            </Text>
            <View style={styles.chipRow}>
              {[
                'Light movement', 'Magnesium-rich foods',
                '7–9 hrs sleep', 'Stay hydrated', 'Limit caffeine',
              ].map((c) => (
                <View key={c} style={styles.chip}>
                  <Text style={styles.chipText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        </FadeSection>


      </Animated.ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8ff' },
  scroll: { flexGrow: 1 },
  greeting: { fontSize: 14, color: '#9b8fd4', marginBottom: 4 },
  name: { fontSize: 30, fontWeight: '500', color: '#2d2650', marginBottom: 6 },
  subtext: { fontSize: 14, color: '#9b8fd4' },
  section: { paddingHorizontal: 28, paddingVertical: 32 },
  sectionTitle: { fontSize: 17, fontWeight: '500', color: '#2d2650', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#9b8fd4', marginBottom: 20 },
  sliderCard: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(180,160,230,0.3)',
  },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 13, fontWeight: '500', color: '#2d2650' },
  sliderEnds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  sliderEnd: { fontSize: 11, color: '#b8a9e8' },
  sectionDivider: { height: 60, marginVertical: 8 },
  aiTag: { fontSize: 11, letterSpacing: 0.08, color: '#b8a9e8', marginBottom: 8 },
  aiHeading: { fontSize: 22, fontWeight: '500', color: '#2d2650', marginBottom: 12 },
  aiBody: { fontSize: 14, lineHeight: 22, color: '#6b5f99', flex: 1 },
  riskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  riskDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#c4b0e8', marginTop: 7 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: {
    backgroundColor: 'rgba(180,160,230,0.15)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(180,160,230,0.4)',
  },
  chipText: { fontSize: 12, color: '#7b6ab8' },
  insightsLink: {
    fontSize: 14,
    color: '#9b8fd4',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
});

