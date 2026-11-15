import { useRef, useState } from "react";
import { Text } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../lib/AuthContext";
import { ApiError } from "../../lib/api";
import { t } from "../../i18n";
import { AuthScreen, footerStyles } from "../../components/AuthScreen";
import { FormField, type TextInputRef } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { GoogleSignInButton } from "../../components/GoogleSignInButton";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function loginErrorMessage(e: unknown) {
  if (e instanceof ApiError) {
    if (e.status === 401) return t("auth.login.invalidCredentials");
    return e.message;
  }
  return t("auth.login.failed");
}

export default function LoginScreen() {
  const { signIn } = useAuth();
  const passwordRef = useRef<TextInputRef>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(t("auth.validation.emailAndPasswordRequired"));
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError(t("auth.validation.invalidEmail"));
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      // On success the root layout switches to (tabs)
      await signIn(email, password);
    } catch (e) {
      setError(loginErrorMessage(e));
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      error={error}
      footer={
        <>
          <Text style={footerStyles.text}>{t("auth.login.noAccount")}</Text>
          <Link href="/register" replace style={footerStyles.link}>
            {t("auth.login.goToRegister")}
          </Link>
        </>
      }
    >
      <FormField
        label={t("fields.email")}
        icon="mail"
        placeholder={t("fields.emailPlaceholder")}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <FormField
        ref={passwordRef}
        label={t("fields.password")}
        icon="lock-closed"
        placeholder={t("fields.passwordPlaceholder")}
        password
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />
      <PrimaryButton title={t("auth.login.submit")} onPress={handleLogin} loading={submitting} />
      <GoogleSignInButton onError={setError} disabled={submitting} />
    </AuthScreen>
  );
}
