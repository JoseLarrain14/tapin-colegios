import { Stack } from 'expo-router';
import { colors } from '../../src/constants/theme';

export default function RegisterLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: '600',
          color: colors.textPrimary,
        },
        headerShadowVisible: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Registro',
          headerBackTitle: 'Volver',
        }}
      />
      <Stack.Screen
        name="step2"
        options={{
          title: 'Datos Personales',
          headerBackTitle: 'Volver',
        }}
      />
      <Stack.Screen
        name="step3"
        options={{
          title: 'Contrasena',
          headerBackTitle: 'Volver',
        }}
      />
      <Stack.Screen
        name="step4"
        options={{
          title: 'Confirmar',
          headerBackTitle: 'Volver',
        }}
      />
      <Stack.Screen
        name="step5"
        options={{
          title: 'Seleccionar Colegio',
          headerBackTitle: 'Volver',
        }}
      />
    </Stack>
  );
}
