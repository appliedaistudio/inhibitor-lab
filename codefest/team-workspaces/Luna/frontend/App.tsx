import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import WelcomeScreen from './src/screens/Welcome';
import DashboardScreen from './src/screens/Dashboard';
import CommunityScreen from './src/screens/Community';
import IntroDisplay from './src/screens/IntroDisplay';
import StartQuiz from './src/screens/StartQuiz';
import Questionnaire from './src/screens/Questionnaire';
import Results from './src/screens/Results';

export type RootStackParamList = {
  MainTabs: undefined;
  Welcome: undefined;
  IntroDisplay: undefined;
  StartQuiz: undefined;
  Questionnaire: undefined;
  Results: { analyzeData: any; matchData: any };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
    </Tab.Navigator>
  );
}
/*
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}*/


export default function App() {
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!onboardingComplete ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="IntroDisplay" component={IntroDisplay} />
            <Stack.Screen name="StartQuiz" component={StartQuiz} />
            <Stack.Screen name="Questionnaire" component={Questionnaire} />
            <Stack.Screen name="Results" component={Results} />
          </>
        ) : (
          <Stack.Screen name="MainTabs" component={MainTabs} />
          
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
  