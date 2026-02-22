import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  GestureResponderEvent,
} from "react-native";
import { Tabs } from "expo-router";
import { Home, Trophy, Map, Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

type TabIconProps = {
  color: string;
  focused: boolean;
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
};

function TabIcon({ color, focused, icon: Icon, label }: TabIconProps) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.85)).current;
  const glowAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1 : 0.85,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: focused ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <View style={styles.tabIconContainer}>
      <Animated.View
        style={[
          styles.tabGlow,
          {
            opacity: glowAnim,
            backgroundColor: color + "15",
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          alignItems: "center" as const,
        }}
      >
        <Icon size={22} color={color} />
        <Text
          style={[
            styles.tabLabel,
            { color, fontWeight: focused ? ("700" as const) : ("500" as const) },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors.dark.background,
          borderBottomWidth: 0,
          ...Platform.select({
            ios: {
              shadowColor: "transparent",
            },
            android: {
              elevation: 0,
            },
            default: {},
          }),
        },
        headerTitleStyle: {
          color: Colors.dark.text,
          fontWeight: "800" as const,
          fontSize: 18,
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: Colors.dark.tabActive,
        tabBarInactiveTintColor: Colors.dark.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.dark.tabBar,
          borderTopWidth: 1,
          borderTopColor: Colors.dark.tabBarBorder,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
        },
        tabBarShowLabel: false,
        tabBarButton: ({ style, children, onPress, ...rest }) => (
          <Pressable
            onPress={(e) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (onPress) {
                (onPress as (e: GestureResponderEvent) => void)(e);
              }
            }}
            style={[style as any, { flex: 1 }]}
          >
            {children}
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Castle",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Home} color={color} focused={focused} label="Castle" />
          ),
        }}
      />
      <Tabs.Screen
        name="dragon-lair"
        options={{
          title: "Dragon Lair",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Trophy} color={color} focused={focused} label="Lair" />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Map} color={color} focused={focused} label="Map" />
          ),
        }}
      />
      <Tabs.Screen
        name="sage"
        options={{
          title: "Sage",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Sparkles} color={color} focused={focused} label="Sage" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: 60,
    height: 48,
  },
  tabGlow: {
    position: "absolute" as const,
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: 0.5,
  },
});
