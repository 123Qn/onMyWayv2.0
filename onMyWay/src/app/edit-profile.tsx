import { useState } from "react";
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import { flagEmoji } from "../lib/format";
import { uploadPhoto } from "../lib/postsApi";
import { updateMyProfile, type ProfilePatch } from "../lib/profileApi";
import { useRewards } from "../lib/rewards";
import { colors, font, radius } from "../lib/theme";
import { AvatarFrame } from "../components/AvatarFrame";
import { CountryPicker } from "../components/CountryPicker";
import { PrimaryButton } from "../components/PrimaryButton";

const MAX_BIO = 300;

export default function EditProfileScreen() {
  const { user } = useAuth();
  const { frame, about } = useRewards();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(about.bio ?? "");
  const [country, setCountry] = useState<{ code: string; name: string } | null>(
    about.countryCode ? { code: about.countryCode, name: about.country ?? about.countryCode } : null
  );
  // A new photo picked on this screen (local preview), or "remove"
  const [photo, setPhoto] = useState<{ uri: string } | "remove" | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const avatarUri = photo === "remove" ? null : (photo?.uri ?? about.avatarUrl ?? user.avatarUrl ?? null);
  const hasPhoto = !!avatarUri;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setPhoto({ uri: result.assets[0].uri });
  };

  const changePhoto = () => {
    if (!hasPhoto) return pickPhoto();
    Alert.alert(t("editProfile.photo"), undefined, [
      { text: t("editProfile.choosePhoto"), onPress: pickPhoto },
      { text: t("editProfile.removePhoto"), style: "destructive", onPress: () => setPhoto("remove") },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return Alert.alert(t("editProfile.nameRequired"));
    setSaving(true);
    try {
      const patch: ProfilePatch = {};
      if (trimmed !== user.name) patch.name = trimmed;
      if (bio.trim() !== (about.bio ?? "")) patch.bio = bio.trim() || null;
      if ((country?.code ?? null) !== about.countryCode) patch.countryCode = country?.code ?? null;
      if (photo === "remove") patch.avatarMediaId = null;
      else if (photo) patch.avatarMediaId = (await uploadPhoto(photo.uri)).id;
      if (Object.keys(patch).length) await updateMyProfile(patch);
      router.back();
    } catch (e) {
      Alert.alert(t("editProfile.saveFailed"), e instanceof Error ? e.message : t("common.genericError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("common.cancel")} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.inkBlack} />
        </Pressable>
        <Text style={styles.title}>{t("editProfile.title")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={changePhoto} accessibilityRole="button" accessibilityLabel={t("editProfile.photo")} style={styles.avatar}>
            <AvatarFrame name={name || user.name} frame={frame} avatarSize={96} uri={avatarUri} />
            <Text style={styles.changePhoto}>{hasPhoto ? t("editProfile.changePhoto") : t("editProfile.addPhoto")}</Text>
          </Pressable>

          <Field label={t("editProfile.name")}>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={100}
              style={styles.input}
              selectionColor={colors.tealGreen}
              cursorColor={colors.deepGreen}
            />
          </Field>

          <Field label={t("editProfile.bio")} hint={`${bio.length}/${MAX_BIO}`}>
            <TextInput
              value={bio}
              onChangeText={setBio}
              maxLength={MAX_BIO}
              multiline
              placeholder={t("editProfile.bioPlaceholder")}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.bio]}
              selectionColor={colors.tealGreen}
              cursorColor={colors.deepGreen}
            />
          </Field>

          <Field label={t("editProfile.country")}>
            <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button" style={[styles.input, styles.select]}>
              <Text style={country ? styles.selectText : styles.placeholder}>
                {country ? `${flagEmoji(country.code)}  ${country.name}` : t("editProfile.chooseCountry")}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </Pressable>
          </Field>

          <View style={styles.save}>
            <PrimaryButton title={t("editProfile.save")} icon="checkmark" onPress={save} loading={saving} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CountryPicker
        visible={pickerOpen}
        value={country?.code ?? null}
        onSelect={(c) => {
          setCountry(c);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerSpacer: { width: 24 },
  title: { color: colors.inkBlack, fontSize: 17, fontWeight: font.bold },
  content: { padding: 20, gap: 18 },
  avatar: { alignItems: "center", gap: 8 },
  changePhoto: { color: colors.deepGreen, fontSize: 15, fontWeight: font.bold },
  field: { gap: 6 },
  labelRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { color: colors.inkBlack, fontSize: 14, fontWeight: font.bold },
  hint: { color: colors.textMuted, fontSize: 12 },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.inkBlack,
    fontSize: 16,
  },
  bio: { minHeight: 96, textAlignVertical: "top" },
  select: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectText: { color: colors.inkBlack, fontSize: 16 },
  placeholder: { color: colors.textMuted, fontSize: 16 },
  save: { marginTop: 8 },
});
