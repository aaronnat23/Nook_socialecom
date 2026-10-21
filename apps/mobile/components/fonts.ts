import { useFonts } from 'expo-font';

/** Font family names registered by useNookFonts. Weights are separate families on native. */
export const font = {
  body: 'BricolageGrotesque_400Regular',
  medium: 'BricolageGrotesque_500Medium',
  semibold: 'BricolageGrotesque_600SemiBold',
  bold: 'BricolageGrotesque_700Bold',
  extra: 'BricolageGrotesque_800ExtraBold',
  display: 'Caprasimo_400Regular',
  hand: 'Caveat_700Bold',
  handMedium: 'Caveat_500Medium',
} as const;

export function useNookFonts() {
  return useFonts({
    [font.body]: require('../assets/fonts/BricolageGrotesque_400Regular.ttf'),
    [font.medium]: require('../assets/fonts/BricolageGrotesque_500Medium.ttf'),
    [font.semibold]: require('../assets/fonts/BricolageGrotesque_600SemiBold.ttf'),
    [font.bold]: require('../assets/fonts/BricolageGrotesque_700Bold.ttf'),
    [font.extra]: require('../assets/fonts/BricolageGrotesque_800ExtraBold.ttf'),
    [font.display]: require('../assets/fonts/Caprasimo_400Regular.ttf'),
    [font.hand]: require('../assets/fonts/Caveat_700Bold.ttf'),
    [font.handMedium]: require('../assets/fonts/Caveat_500Medium.ttf'),
  });
}
