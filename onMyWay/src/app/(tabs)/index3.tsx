import { Text, View, StyleSheet } from "react-native";
import { SafeAreaView} from "react-native-safe-area-context";
import { Appearance, useColorScheme } from 'react-native';

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <Text>Edit src/app/index.tsx to edit this screen.</Text>
      <MyComponent />
    </SafeAreaView>
  );
}

function MyComponent() {
  let colorScheme = useColorScheme();
  if (colorScheme === 'dark') {
    return <Text>Dark mode is enabled 44444444</Text>;
  } else {
    return <Text>Light mode is enabled 3333</Text>;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
