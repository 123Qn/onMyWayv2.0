import { Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { withUniwind } from "uniwind";

// Uniwind adds className to React Native's own components; anything else is wrapped here.

/** Safe-area screen container that takes className: <Screen className="flex-1 bg-white" edges={["top"]}> */
export const Screen = withUniwind(SafeAreaView);

/** expo-image with className */
export const Img = withUniwind(ExpoImage);

/** Animated views with className for the static look; animated values still go in style */
export const AnimatedView = withUniwind(Animated.View);
export const AnimatedText = withUniwind(Animated.Text);
export const AnimatedScrollView = withUniwind(Animated.ScrollView);
