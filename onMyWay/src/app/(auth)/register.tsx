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
const MIN_PASSWORD = 6; // matches the backend rule

function registerErrorMessage(e: unknown) {
  if (e instanceof ApiError) {
    if (e.status === 409) return t("auth.register.emailTaken");
    return e.message;
  }
  return t("auth.register.failed");
}

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const emailRef = useRef<TextInputRef>(null);
  const passwordRef = useRef<TextInputRef>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError(t("auth.validation.allFieldsRequired"));
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError(t("auth.validation.invalidEmail"));
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(t("auth.validation.passwordTooShort", { min: MIN_PASSWORD }));
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      // Registering also signs in; the root layout switches to (tabs)
      await signUp(name, email, password);
    } catch (e) {
      setError(registerErrorMessage(e));
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
      error={error}
      footer={
        <>
          <Text style={footerStyles.text}>{t("auth.register.hasAccount")}</Text>
          <Link href="/login" replace style={footerStyles.link}>
            {t("auth.register.goToLogin")}
          </Link>
        </>
      }
    >
      <FormField
        label={t("fields.name")}
        icon="person"
        placeholder={t("fields.namePlaceholder")}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <FormField
        ref={emailRef}
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
        placeholder={t("fields.newPasswordPlaceholder", { min: MIN_PASSWORD })}
        password
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleRegister}
      />
      <PrimaryButton title={t("auth.register.submit")} onPress={handleRegister} loading={submitting} />
      <GoogleSignInButton onError={setError} disabled={submitting} />
    </AuthScreen>
  );
}
