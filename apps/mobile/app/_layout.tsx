import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { NestedNavigation } from '../components/navigation';
import { Provider } from '../components/provider';
import { NookMark } from '../components/brand';
import { font, useNookFonts } from '../components/fonts';
import { C } from '../components/ui';

export default function Layout() {
  const [fontsReady, fontError] = useNookFonts();
  if (!fontsReady && !fontError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.paper,
        }}
      >
        <NookMark size={72} />
      </View>
    );
  }
  return (
    <Provider>
      <View style={{ flex: 1, backgroundColor: C.paper }}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerBackButtonDisplayMode: 'minimal',
            headerBackTitle: 'Back',
            headerTintColor: C.ink,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: C.paper },
            headerTitleStyle: { fontFamily: font.display, fontSize: 20, color: C.ink },
            contentStyle: { backgroundColor: C.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="editor" options={{ title: 'Your design', headerShown: false }} />
          <Stack.Screen name="shop/[slug]" options={{ title: 'A nook' }} />
          <Stack.Screen name="product/[slug]" options={{ title: 'A little find' }} />
          <Stack.Screen name="products" options={{ title: 'Your collection' }} />
          <Stack.Screen name="orders" options={{ title: 'Orders' }} />
          <Stack.Screen name="cart" options={{ title: 'Your little bag' }} />
          <Stack.Screen name="checkout/[shopId]" options={{ title: 'Sandbox checkout' }} />
          <Stack.Screen name="order/[id]" options={{ title: 'Your order' }} />
        </Stack>
        <NestedNavigation />
      </View>
    </Provider>
  );
}
