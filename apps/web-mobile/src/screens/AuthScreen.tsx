import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';
import { Brand } from '../components/ui';
import { AuthApiError, login, registerAccount, resendVerification, type AuthSession } from '../services/auth.client';
import { colors, radius, spacing } from '../theme';

type Mode = 'login' | 'register' | 'pending';

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => Promise<void> }) {
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const compact = width < 720;

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    setError(null);
    setNotice(null);

    if (!normalizedEmail || !password) {
      setError('Escribe tu correo y contraseña.');
      return;
    }

    if (mode === 'register' && (!name.trim() || !companyName.trim() || password.length < 10)) {
      setError('Completa todos los campos y usa una contraseña de al menos 10 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const result = await registerAccount({
          name: name.trim(),
          companyName: companyName.trim(),
          email: normalizedEmail,
          password
        });
        setNotice(result.message);
        setMode('pending');
        return;
      }

      const session = await login(normalizedEmail, password);
      await onAuthenticated(session);
    } catch (cause) {
      if (cause instanceof AuthApiError && cause.code === 'EMAIL_NOT_VERIFIED') {
        setMode('pending');
        setNotice('Tu cuenta existe, pero todavía debes confirmar el correo.');
      } else {
        setError(cause instanceof Error ? cause.message : 'No fue posible completar la solicitud.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!email.trim()) {
      setError('Escribe el correo de la cuenta.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await resendVerification(email.trim().toLowerCase());
      setNotice(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible reenviar el correo.');
    } finally {
      setLoading(false);
    }
  }

  function changeMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.layout, compact && styles.layoutCompact]}>
          {!compact ? (
            <View style={styles.intro}>
              <Brand />
              <Text style={styles.kicker}>GESTIÓN EMPRESARIAL SEGURA</Text>
              <Text style={styles.heroTitle}>Tu operación, conectada en una sola órbita.</Text>
              <Text style={styles.heroCopy}>Ventas, inventario y contactos con acceso protegido y confirmación de correo.</Text>
              <View style={styles.trustRow}><Text style={styles.trustGlyph}>✓</Text><Text style={styles.trustText}>Sesión cifrada en Android</Text></View>
              <View style={styles.trustRow}><Text style={styles.trustGlyph}>✓</Text><Text style={styles.trustText}>La misma cuenta funciona en web</Text></View>
            </View>
          ) : null}

          <View style={styles.card}>
            {compact ? <View style={styles.mobileBrand}><Brand /></View> : null}
            {mode === 'pending' ? (
              <>
                <View style={styles.mailIcon}><Text style={styles.mailGlyph}>✉</Text></View>
                <Text style={styles.title}>Confirma tu correo</Text>
                <Text style={styles.description}>Enviamos un enlace a <Text style={styles.emailStrong}>{email.trim()}</Text>. Después de confirmarlo, vuelve aquí para iniciar sesión.</Text>
                {notice ? <Message tone="success" text={notice} /> : null}
                {error ? <Message tone="error" text={error} /> : null}
                <PrimaryButton label="Ya confirmé mi correo" loading={loading} onPress={() => changeMode('login')} />
                <Pressable disabled={loading} onPress={resend} style={styles.textButton}><Text style={styles.textButtonLabel}>Reenviar correo de confirmación</Text></Pressable>
                <Pressable disabled={loading} onPress={() => changeMode('register')} style={styles.subtleButton}><Text style={styles.subtleLabel}>Usar otra cuenta</Text></Pressable>
              </>
            ) : (
              <>
                <Text style={styles.eyebrow}>{mode === 'login' ? 'BIENVENIDO DE NUEVO' : 'NUEVA CUENTA'}</Text>
                <Text style={styles.title}>{mode === 'login' ? 'Inicia sesión' : 'Crea tu espacio de trabajo'}</Text>
                <Text style={styles.description}>{mode === 'login' ? 'Accede a tu información empresarial.' : 'Te enviaremos un correo para confirmar tu identidad.'}</Text>

                {mode === 'register' ? (
                  <>
                    <Field label="Nombre completo" value={name} onChangeText={setName} autoComplete="name" />
                    <Field label="Nombre de la empresa" value={companyName} onChangeText={setCompanyName} />
                  </>
                ) : null}
                <Field label="Correo electrónico" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" />
                <Field label="Contraseña" value={password} onChangeText={setPassword} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} secureTextEntry />
                {mode === 'register' ? <Text style={styles.passwordHint}>Mínimo 10 caracteres.</Text> : null}

                {notice ? <Message tone="success" text={notice} /> : null}
                {error ? <Message tone="error" text={error} /> : null}
                <PrimaryButton label={mode === 'login' ? 'Entrar a Orbit ERP' : 'Crear cuenta'} loading={loading} onPress={submit} />

                <View style={styles.switchRow}>
                  <Text style={styles.switchCopy}>{mode === 'login' ? '¿Aún no tienes cuenta?' : '¿Ya tienes una cuenta?'}</Text>
                  <Pressable disabled={loading} onPress={() => changeMode(mode === 'login' ? 'register' : 'login')}>
                    <Text style={styles.switchAction}>{mode === 'login' ? 'Regístrate' : 'Inicia sesión'}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        autoCapitalize="none"
        placeholderTextColor={colors.textDim}
        selectionColor={colors.primaryBright}
        style={styles.input}
      />
    </View>
  );
}

function PrimaryButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]}>
      {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryLabel}>{label}</Text>}
    </Pressable>
  );
}

function Message({ tone, text }: { tone: 'success' | 'error'; text: string }) {
  return <View style={[styles.message, tone === 'success' ? styles.messageSuccess : styles.messageError]}><Text style={styles.messageText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  ambientTop: { position: 'absolute', width: 520, height: 520, borderRadius: 260, top: -330, right: -180, backgroundColor: colors.glow },
  ambientBottom: { position: 'absolute', width: 430, height: 430, borderRadius: 215, bottom: -300, left: -170, backgroundColor: 'rgba(21, 87, 200, 0.12)' },
  layout: { width: '100%', maxWidth: 1040, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 70 },
  layoutCompact: { maxWidth: 480, flexDirection: 'column', gap: 0 },
  intro: { flex: 1, maxWidth: 500 },
  kicker: { color: colors.primaryBright, fontSize: 11, fontWeight: '800', letterSpacing: 1.8, marginTop: 48, marginBottom: 14 },
  heroTitle: { color: colors.text, fontSize: 44, lineHeight: 50, fontWeight: '800', letterSpacing: -1.4 },
  heroCopy: { color: colors.textMuted, fontSize: 16, lineHeight: 25, marginTop: 18, marginBottom: 28 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  trustGlyph: { color: colors.success, fontSize: 16, fontWeight: '800' },
  trustText: { color: colors.textMuted, fontSize: 13 },
  card: { width: '100%', maxWidth: 430, padding: 28, borderRadius: 26, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card, shadowColor: '#000000', shadowOpacity: 0.42, shadowRadius: 32, shadowOffset: { width: 0, height: 18 } },
  mobileBrand: { marginBottom: 28 },
  eyebrow: { color: colors.primaryBright, fontSize: 10, fontWeight: '800', letterSpacing: 1.7, marginBottom: 10 },
  title: { color: colors.text, fontSize: 27, fontWeight: '800', letterSpacing: -0.6 },
  description: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 9, marginBottom: 22 },
  emailStrong: { color: colors.text, fontWeight: '700' },
  field: { gap: 7, marginBottom: 15 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  input: { height: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.backgroundSoft, color: colors.text, fontSize: 14, paddingHorizontal: 15 },
  passwordHint: { color: colors.textDim, fontSize: 10, marginTop: -8, marginBottom: 15 },
  primaryButton: { height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, marginTop: 5, shadowColor: colors.primary, shadowOpacity: 0.36, shadowRadius: 16 },
  primaryLabel: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  textButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  textButtonLabel: { color: colors.primaryBright, fontSize: 12, fontWeight: '700' },
  subtleButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  subtleLabel: { color: colors.textMuted, fontSize: 11 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 22 },
  switchCopy: { color: colors.textMuted, fontSize: 12 },
  switchAction: { color: colors.primaryBright, fontSize: 12, fontWeight: '800' },
  message: { borderWidth: 1, borderRadius: 12, padding: 11, marginBottom: 12 },
  messageSuccess: { borderColor: 'rgba(53, 208, 127, 0.35)', backgroundColor: 'rgba(53, 208, 127, 0.10)' },
  messageError: { borderColor: 'rgba(255, 90, 107, 0.35)', backgroundColor: 'rgba(255, 90, 107, 0.10)' },
  messageText: { color: colors.text, fontSize: 11, lineHeight: 17 },
  mailIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glow, borderWidth: 1, borderColor: colors.borderStrong, marginBottom: 20 },
  mailGlyph: { color: colors.primaryBright, fontSize: 27 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.66 }
});

