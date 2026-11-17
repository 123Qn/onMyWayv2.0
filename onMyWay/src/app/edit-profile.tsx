import { useState } from "react";
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import { flagEmoji } from "../lib/format";
import { uploadPhoto } from "../lib/postsApi";
import { updateMyProfile, type ProfilePatch } from "../lib/profileApi";
import { useRewards } from "../lib/rewards";
import { cn } from "../lib/cn";
import { colors } from "../lib/theme";
import { AvatarFrame } from "../components/AvatarFrame";
import { CountryPicker } from "../components/CountryPicker";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen, ScreenHeader } from "../components/ui";

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
    <Screen className="flex-1 bg-white">
      <ScreenHeader title={t("editProfile.title")} icon="close" />

      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <ScrollView contentContainerClassName="gap-4.5 p-5" keyboardShouldPersistTaps="handled">
          <Pressable onPress={changePhoto} accessibilityRole="button" accessibilityLabel={t("editProfile.photo")} className="items-center gap-2">
            <AvatarFrame name={name || user.name} frame={frame} avatarSize={96} uri={avatarUri} />
            <Text className="text-[15px] font-bold text-deep-green">{hasPhoto ? t("editProfile.changePhoto") : t("editProfile.addPhoto")}</Text>
          </Pressable>

          <Field label={t("editProfile.name")}>
            <Input value={name} onChangeText={setName} maxLength={100} />
          </Field>

          <Field label={t("editProfile.bio")} hint={`${bio.length}/${MAX_BIO}`}>
            <Input
              value={bio}
              onChangeText={setBio}
              maxLength={MAX_BIO}
              multiline
              placeholder={t("editProfile.bioPlaceholder")}
              className="min-h-24 align-top"
            />
          </Field>

          <Field label={t("editProfile.country")}>
            <Pressable
              onPress={() => setPickerOpen(true)}
              accessibilityRole="button"
              className="flex-row items-center justify-between rounded-md border border-line px-3.5 py-3"
            >
              <Text className={cn("text-base", country ? "text-ink" : "text-muted")}>
                {country ? `${flagEmoji(country.code)}  ${country.name}` : t("editProfile.chooseCountry")}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </Pressable>
          </Field>

          <View className="mt-2">
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
    </Screen>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <View className="flex-row justify-between">
        <Text className="text-sm font-bold text-ink">{label}</Text>
        {hint ? <Text className="text-xs text-muted">{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** Bordered text box in the brand colors */
function Input({ className, ...props }: TextInputProps & { className?: string }) {
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      selectionColor={colors.tealGreen}
      cursorColor={colors.deepGreen}
      className={cn("rounded-md border border-line px-3.5 py-3 text-base text-ink", className)}
      {...props}
    />
  );
}
