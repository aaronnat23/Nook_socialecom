import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { NestedNavigation } from '../components/navigation';
import { Provider } from '../components/provider';
import { C } from '../components/ui';
export default function Layout() {
  return (
    <Provider>
      <View style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: C.primary,
            headerStyle: { backgroundColor: '#FFF' },
            headerTitleStyle: { fontSize: 16 },
            contentStyle: { backgroundColor: C.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="editor" options={{ title: 'Your design', headerShown: false }} />
          <Stack.Screen name="shop/[slug]" options={{ title: 'Independent space' }} />
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
