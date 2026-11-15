import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { t } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import type { PlaceCategory, PostKind } from "../lib/mockFeed";
import { createPost, uploadPhoto, type NewPostStop } from "../lib/postsApi";
import { PermissionError, pickPhotos, takePhoto, type PostPhoto } from "../lib/verify";
import { LocationPicker, type Coords } from "../components/LocationPicker";
import { colors, font, radius } from "../lib/theme";

const KINDS: { kind: PostKind; icon: keyof typeof Ionicons.glyphMap }[] = [
  { kind: "trip", icon: "map" },
  { kind: "moment", icon: "camera" },
  { kind: "question", icon: "chatbubbles" },
];
const CATEGORIES: PlaceCategory[] = ["beach", "island", "mountain", "city", "food", "nature", "culture"];
const MAX_LOCATIONS = 15;

/** One stop of the trip: its own photo, name, details and map pin */
type TripLocation = {
  key: string;
  photo?: PostPhoto;
  name: string;
  caption: string;
  /** fromPhoto: taken from the photo's GPS (verifiable); otherwise placed by the user */
  pin?: Coords & { fromPhoto: boolean };
};

let locationSeq = 0;
const newLocation = (): TripLocation => ({ key: `loc-${locationSeq++}`, name: "", caption: "" });

// Ask camera or library, then return the picked photo (null when cancelled)
function choosePhoto(): Promise<PostPhoto | null> {
  return new Promise((resolve, reject) => {
    const run = (from: "camera" | "library") => () => {
      const pick = from === "camera" ? takePhoto() : pickPhotos(1).then((list) => list[0] ?? null);
      pick.then(resolve, reject);
    };
    Alert.alert(
      t("create.addPhoto"),
      undefined,
      [
        { text: t("create.camera"), onPress: run("camera") },
        { text: t("create.library"), onPress: run("library") },
        { text: t("common.cancel"), style: "cancel", onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}

export default function CreateScreen() {
  const { user } = useAuth();
  // The feed's "Your moment" shortcut opens this screen as a moment and goes straight to the camera
  const params = useLocalSearchParams<{ kind?: string }>();
  const startKind: PostKind = params.kind === "moment" || params.kind === "question" ? params.kind : "trip";
  const [kind, setKind] = useState<PostKind>(startKind);
  // Which photo slot is loading: "cover", "moment" or a location key
  const [busy, setBusy] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // Trip
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState<PostPhoto | null>(null);
  const [locations, setLocations] = useState<TripLocation[]>(() => [newLocation()]);
  const [days, setDays] = useState(2);
  // Location whose pin is being placed on the map picker
  const [pinFor, setPinFor] = useState<string | null>(null);

  // Moment / question
  const [momentPhoto, setMomentPhoto] = useState<PostPhoto | null>(null);
  const [placeText, setPlaceText] = useState("");

  // Shared
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("nature");

  // Verified only when every photo that pins a place proves where it was taken
  const proofPhotos =
    kind === "trip"
      ? locations.map((l) => l.photo)
      : kind === "moment"
        ? [momentPhoto ?? undefined]
        : [];
  // Judged on the photos added so far; posting still requires a photo for every location
  const added = proofPhotos.filter((p): p is PostPhoto => !!p);
  // A pin moved by hand is no longer proven by the photo
  const pinsFromPhotos = kind !== "trip" || locations.every((l) => !l.photo || l.pin?.fromPhoto);
  const verified = added.length > 0 && added.every((p) => p.verified) && pinsFromPhotos;
  const verifiedPlace = verified ? added.find((p) => p.place)?.place : undefined;
  const hasProofPhoto = added.length > 0;

  const tripReady =
    title.trim().length > 0 &&
    !!cover &&
    locations.every((l) => l.photo && l.pin && l.name.trim().length > 0);
  const placeName =
    kind === "trip"
      ? verifiedPlace?.name ?? locations[0]?.name.trim() ?? ""
      : verifiedPlace?.name ?? placeText.trim();
  const canPost =
    !busy &&
    (kind === "trip"
      ? tripReady
      : caption.trim().length > 0 &&
        placeName.length > 0 &&
        (kind === "question" || !!momentPhoto?.verified));

  const dirty =
    !!title.trim() || !!cover || !!momentPhoto || !!caption.trim() || !!placeText.trim() ||
    locations.some((l) => l.photo || l.name.trim() || l.caption.trim());

  const pickInto = async (
    slot: string,
    apply: (photo: PostPhoto) => void,
    source: "ask" | "camera" = "ask"
  ) => {
    try {
      const photo = source === "camera" ? await shootWithSpinner(slot) : await choosePhotoWithSpinner(slot);
      if (photo) apply(photo);
    } catch (e) {
      if (e instanceof PermissionError) {
        Alert.alert(e.message === "camera" ? t("create.permissionCamera") : t("create.permissionLibrary"));
      } else {
        Alert.alert(t("create.pickFailed"));
      }
    } finally {
      setBusy(null);
    }
  };

  // The spinner shows only once a source is chosen (the picker itself is native UI)
  const choosePhotoWithSpinner = async (slot: string) => {
    const photo = choosePhoto();
    setBusy(slot);
    return photo;
  };

  // Moments open the camera straight away: the photo and the GPS fix are both from right now
  const shootWithSpinner = async (slot: string) => {
    const photo = takePhoto();
    setBusy(slot);
    return photo;
  };

  const updateLocation = (key: string, patch: Partial<TripLocation>) =>
    setLocations((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const close = () => {
    if (posting) return;
    if (!dirty) return router.back();
    Alert.alert(t("create.discardTitle"), undefined, [
      { text: t("create.keepEditing"), style: "cancel" },
      { text: t("create.discard"), style: "destructive", onPress: () => router.back() },
    ]);
  };

  useEffect(() => {
    if (startKind === "moment") pickInto("moment", setMomentPhoto, "camera");
    // only once, when opened from the shortcut
  }, []);

  // Android back button asks before throwing a draft away
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!dirty) return false;
      close();
      return true;
    });
    return () => sub.remove();
  });

  const submit = async () => {
    if (!canPost || !user || posting) return;
    setPosting(true);
    try {
      // Upload every photo once (the cover can also be a location photo), then create the post
      const uris =
        kind === "trip"
          ? [cover!.uri, ...locations.map((l) => l.photo!.uri)]
          : kind === "moment"
            ? [momentPhoto!.uri]
            : [];
      const mediaIds = new Map<string, number>();
      for (const uri of new Set(uris)) mediaIds.set(uri, (await uploadPhoto(uri)).id);

      let stops: NewPostStop[] = [];
      if (kind === "trip") {
        stops = locations.map((l) => ({
          name: l.name.trim(),
          caption: l.caption.trim() || undefined,
          mediaId: mediaIds.get(l.photo!.uri)!,
          latitude: l.pin!.latitude,
          longitude: l.pin!.longitude,
          fromPhoto: l.pin!.fromPhoto,
        }));
      } else if (kind === "moment" && momentPhoto?.latitude !== undefined && momentPhoto.longitude !== undefined) {
        stops = [
          {
            name: placeName,
            mediaId: mediaIds.get(momentPhoto.uri)!,
            latitude: momentPhoto.latitude,
            longitude: momentPhoto.longitude,
            fromPhoto: momentPhoto.verified,
          },
        ];
      }

      await createPost({
        kind,
        title: kind === "trip" ? title.trim() : undefined,
        caption: caption.trim() || undefined,
        category,
        place: { name: placeName, country: verifiedPlace?.country, countryCode: verifiedPlace?.countryCode },
        coverMediaId: kind === "trip" ? mediaIds.get(cover!.uri) : undefined,
        tripDays: kind === "trip" ? days : undefined,
        stops,
      });
      router.back();
    } catch (e) {
      Alert.alert(t("create.postFailed"), e instanceof Error ? e.message : t("common.genericError"));
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t("create.discard")} hitSlop={8} style={styles.iconButton}>
          <Ionicons name="close" size={26} color={colors.inkBlack} />
        </Pressable>
        <Text style={styles.title}>{t("create.title")}</Text>
        <Pressable
          onPress={submit}
          disabled={!canPost || posting}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canPost }}
          style={({ pressed }) => [styles.postButton, !canPost && styles.postDisabled, pressed && styles.pressed]}
        >
          {posting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.postText}>{t("create.post")}</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.segment}>
            {KINDS.map(({ kind: k, icon }) => {
              const active = k === kind;
              return (
                <Pressable
                  key={k}
                  onPress={() => setKind(k)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.segmentItem, active && styles.segmentActive]}
                >
                  <Ionicons name={icon} size={16} color={active ? colors.white : colors.deepGreen} />
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{t(`create.kinds.${k}`)}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>{t(`create.kindHints.${kind}`)}</Text>

          {kind === "trip" ? (
            <>
              {/* 1. Header */}
              <Text style={styles.label}>{t("create.tripTitle")}</Text>
              <TextInput
                style={[styles.input, styles.titleInput]}
                value={title}
                onChangeText={setTitle}
                placeholder={t("create.tripTitlePlaceholder")}
                placeholderTextColor={colors.textMuted}
                cursorColor={colors.deepGreen}
                maxLength={120}
              />

              {/* 2. Cover */}
              <Text style={styles.label}>{t("create.cover")}</Text>
              <PhotoSlot
                photo={cover}
                loading={busy === "cover"}
                aspectRatio={16 / 10}
                emptyLabel={t("create.addCover")}
                emptyIcon="image"
                onPick={() => pickInto("cover", setCover)}
                showVerification={false}
              />
              <Text style={styles.fieldHint}>{t("create.coverHint")}</Text>

              {/* 3. Locations, repeated */}
              <Text style={styles.label}>{t("create.locations")}</Text>
              <View style={styles.locations}>
                {locations.map((loc, i) => (
                  <View key={loc.key} style={styles.locationCard}>
                    <View style={styles.locationHeader}>
                      <View style={styles.locationNumber}>
                        <Text style={styles.locationNumberText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.locationTitle}>{t("create.locationN", { count: i + 1 })}</Text>
                      {locations.length > 1 ? (
                        <Pressable
                          onPress={() => setLocations((prev) => prev.filter((l) => l.key !== loc.key))}
                          accessibilityRole="button"
                          accessibilityLabel={t("create.removeLocation")}
                          hitSlop={8}
                        >
                          <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                        </Pressable>
                      ) : null}
                    </View>

                    <PhotoSlot
                      photo={loc.photo ?? null}
                      loading={busy === loc.key}
                      aspectRatio={16 / 9}
                      emptyLabel={t("create.addPhoto")}
                      emptyIcon="camera"
                      onPick={() =>
                        pickInto(loc.key, (photo) =>
                          // Prefill the name from the photo's location when the user hasn't typed one
                          setLocations((prev) =>
                            prev.map((l) => {
                              if (l.key !== loc.key) return l;
                              const gps =
                                photo.latitude !== undefined && photo.longitude !== undefined
                                  ? { latitude: photo.latitude, longitude: photo.longitude, fromPhoto: true }
                                  : undefined;
                              // A new GPS photo moves the pin; a photo without GPS keeps a hand-placed pin
                              const pin = gps ?? (l.pin?.fromPhoto ? undefined : l.pin);
                              return { ...l, photo, pin, name: l.name || photo.place?.name || "" };
                            })
                          )
                        )
                      }
                      showVerification
                    />

                    <TextInput
                      style={[styles.input, styles.locationName]}
                      value={loc.name}
                      onChangeText={(v) => updateLocation(loc.key, { name: v })}
                      placeholder={t("create.locationNamePlaceholder")}
                      placeholderTextColor={colors.textMuted}
                      cursorColor={colors.deepGreen}
                      maxLength={100}
                    />
                    <TextInput
                      style={[styles.input, styles.locationCaption]}
                      value={loc.caption}
                      onChangeText={(v) => updateLocation(loc.key, { caption: v })}
                      placeholder={t("create.locationCaptionPlaceholder")}
                      placeholderTextColor={colors.textMuted}
                      cursorColor={colors.deepGreen}
                      multiline
                      maxLength={1000}
                      textAlignVertical="top"
                    />
                    <Pressable
                      onPress={() => setPinFor(loc.key)}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.pinRow, !loc.pin && styles.pinRowMissing, pressed && styles.pressed]}
                    >
                      <Ionicons
                        name={loc.pin ? (loc.pin.fromPhoto ? "shield-checkmark" : "location") : "add-circle"}
                        size={20}
                        color={colors.deepGreen}
                      />
                      <View style={styles.flex}>
                        <Text style={styles.pinTitle}>
                          {loc.pin ? (loc.pin.fromPhoto ? t("create.pinFromPhoto") : t("create.pinManual")) : t("create.pinSet")}
                        </Text>
                        <Text style={styles.pinSub}>
                          {loc.pin
                            ? `${loc.pin.latitude.toFixed(5)}, ${loc.pin.longitude.toFixed(5)}`
                            : t("create.pinMissing")}
                        </Text>
                      </View>
                      <Text style={styles.pinAction}>{loc.pin ? t("create.pinEdit") : t("create.pinOpen")}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>

              {locations.length < MAX_LOCATIONS ? (
                <Pressable
                  onPress={() => setLocations((prev) => [...prev, newLocation()])}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.addLocation, pressed && styles.pressed]}
                >
                  <Ionicons name="add-circle" size={22} color={colors.deepGreen} />
                  <Text style={styles.addLocationText}>{t("create.addLocation")}</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {pinFor ? (
            <LocationPicker
              visible
              initial={locations.find((l) => l.key === pinFor)?.pin}
              initialQuery={locations.find((l) => l.key === pinFor)?.name}
              onClose={() => setPinFor(null)}
              onConfirm={(coords) => {
                const loc = locations.find((l) => l.key === pinFor);
                const same =
                  !!loc?.pin &&
                  Math.abs(loc.pin.latitude - coords.latitude) < 1e-5 &&
                  Math.abs(loc.pin.longitude - coords.longitude) < 1e-5;
                // Leaving the photo's pin untouched keeps it verified
                updateLocation(pinFor, { pin: { ...coords, fromPhoto: same && !!loc?.pin?.fromPhoto } });
                setPinFor(null);
              }}
            />
          ) : null}

          {kind === "moment" ? (
            <>
              <Text style={styles.label}>{t("create.photo")}</Text>
              <PhotoSlot
                photo={momentPhoto}
                loading={busy === "moment"}
                aspectRatio={4 / 5}
                emptyLabel={t("create.takeMoment")}
                emptyIcon="camera"
                onPick={() => pickInto("moment", setMomentPhoto, "camera")}
                showVerification
              />
              <Text style={styles.fieldHint}>{t("create.momentHint")}</Text>
              {momentPhoto && !momentPhoto.verified ? (
                <View style={[styles.banner, styles.bannerWarn]}>
                  <Ionicons name="warning" size={22} color={colors.error} />
                  <View style={styles.flex}>
                    <Text style={styles.bannerTitle}>{t("create.momentNoGpsTitle")}</Text>
                    <Text style={styles.bannerBody}>{t("create.momentNoGpsBody")}</Text>
                  </View>
                </View>
              ) : null}
            </>
          ) : null}

          {hasProofPhoto && (kind !== "moment" || verified) ? (
            <View style={[styles.banner, verified ? styles.bannerVerified : styles.bannerPlain]}>
              <Ionicons
                name={verified ? "shield-checkmark" : "information-circle"}
                size={22}
                color={verified ? colors.deepGreen : colors.textMuted}
              />
              <View style={styles.flex}>
                <Text style={styles.bannerTitle}>
                  {verified
                    ? verifiedPlace
                      ? t("create.verifiedTitle", { place: verifiedPlace.name })
                      : t("create.verifiedHere")
                    : t("create.unverifiedTitle")}
                </Text>
                <Text style={styles.bannerBody}>{verified ? t("create.verifiedBody") : t("create.unverifiedBody")}</Text>
              </View>
            </View>
          ) : null}

          {kind !== "trip" ? (
            <>
              <Text style={styles.label}>{t("create.place")}</Text>
              {verifiedPlace ? (
                <View style={[styles.input, styles.lockedPlace]}>
                  <Ionicons name="location" size={18} color={colors.deepGreen} />
                  <Text style={styles.lockedPlaceText}>
                    {verifiedPlace.name}, {verifiedPlace.country}
                  </Text>
                  <Text style={styles.fieldHint}>{t("create.placeFromPhotos")}</Text>
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  value={placeText}
                  onChangeText={setPlaceText}
                  placeholder={t("create.placePlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  cursorColor={colors.deepGreen}
                  maxLength={150}
                />
              )}
            </>
          ) : null}

          <Text style={styles.label}>{kind === "trip" ? t("create.summary") : t("create.caption")}</Text>
          <TextInput
            style={[styles.input, styles.captionInput]}
            value={caption}
            onChangeText={setCaption}
            placeholder={
              kind === "question"
                ? t("create.questionPlaceholder")
                : kind === "trip"
                  ? t("create.summaryPlaceholder")
                  : t("create.captionPlaceholder")
            }
            placeholderTextColor={colors.textMuted}
            cursorColor={colors.deepGreen}
            multiline
            maxLength={2000}
            textAlignVertical="top"
          />

          <Text style={styles.label}>{t("create.category")}</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(`feed.categories.${c}`)}</Text>
                </Pressable>
              );
            })}
          </View>

          {kind === "trip" ? (
            <>
              <Text style={styles.label}>{t("create.days")}</Text>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setDays((d) => Math.max(1, d - 1))}
                  accessibilityRole="button"
                  accessibilityLabel={t("create.fewerDays")}
                  style={styles.stepButton}
                >
                  <Ionicons name="remove" size={20} color={colors.deepGreen} />
                </Pressable>
                <Text style={styles.stepValue}>{t("create.daysValue", { count: days })}</Text>
                <Pressable
                  onPress={() => setDays((d) => Math.min(60, d + 1))}
                  accessibilityRole="button"
                  accessibilityLabel={t("create.moreDays")}
                  style={styles.stepButton}
                >
                  <Ionicons name="add" size={20} color={colors.deepGreen} />
                </Pressable>
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Empty: dashed "add" tile. Filled: the photo, its verification tag and a change button.
function PhotoSlot({
  photo,
  loading,
  aspectRatio,
  emptyLabel,
  emptyIcon,
  onPick,
  showVerification,
}: {
  photo: PostPhoto | null;
  loading: boolean;
  aspectRatio: number;
  emptyLabel: string;
  emptyIcon: keyof typeof Ionicons.glyphMap;
  onPick: () => void;
  showVerification: boolean;
}) {
  if (loading) {
    return (
      <View style={[styles.slot, styles.slotEmpty, { aspectRatio }]}>
        <ActivityIndicator color={colors.deepGreen} />
        <Text style={styles.slotText}>{t("create.locating")}</Text>
      </View>
    );
  }
  if (!photo) {
    return (
      <Pressable
        onPress={onPick}
        accessibilityRole="button"
        style={({ pressed }) => [styles.slot, styles.slotEmpty, { aspectRatio }, pressed && styles.pressed]}
      >
        <Ionicons name={emptyIcon} size={28} color={colors.deepGreen} />
        <Text style={styles.slotText}>{emptyLabel}</Text>
      </Pressable>
    );
  }
  return (
    <View style={[styles.slot, { aspectRatio }]}>
      <Image source={photo.uri} style={StyleSheet.absoluteFill} contentFit="cover" />
      {showVerification ? (
        <View style={[styles.photoTag, photo.verified ? styles.tagVerified : styles.tagPlain]}>
          <Ionicons
            name={photo.verified ? "shield-checkmark" : "help-circle"}
            size={13}
            color={photo.verified ? colors.white : colors.inkBlack}
          />
          <Text style={[styles.photoTagText, photo.verified && styles.photoTagTextLight]} numberOfLines={1}>
            {photo.verified ? (photo.place?.name ?? t("create.photoVerified")) : t("create.photoNoLocation")}
          </Text>
        </View>
      ) : null}
      <Pressable
        onPress={onPick}
        accessibilityRole="button"
        accessibilityLabel={t("create.changePhoto")}
        style={({ pressed }) => [styles.changePhoto, pressed && styles.pressed]}
      >
        <Ionicons name="swap-horizontal" size={14} color={colors.white} />
        <Text style={styles.changePhotoText}>{t("create.changePhoto")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: colors.inkBlack, fontSize: 18, fontWeight: font.bold },
  postButton: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.deepGreen },
  postDisabled: { backgroundColor: colors.border },
  postText: { color: colors.white, fontSize: 15, fontWeight: font.bold },
  pressed: { opacity: 0.7 },
  content: { padding: 20, paddingBottom: 48 },
  segment: { flexDirection: "row", gap: 6, padding: 4, borderRadius: 16, backgroundColor: colors.limeTint },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentActive: { backgroundColor: colors.deepGreen },
  segmentText: { color: colors.deepGreen, fontSize: 14, fontWeight: font.bold },
  segmentTextActive: { color: colors.white },
  hint: { color: colors.textMuted, fontSize: 13, fontWeight: font.regular, marginTop: 8 },
  label: { color: colors.inkBlack, fontSize: 15, fontWeight: font.bold, marginTop: 22, marginBottom: 8 },
  fieldHint: { color: colors.textMuted, fontSize: 12, fontWeight: font.regular, marginTop: 6 },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    color: colors.inkBlack,
    fontSize: 15,
  },
  titleInput: { fontSize: 18, fontWeight: font.bold },
  captionInput: { minHeight: 100 },
  slot: { width: "100%", borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.softGray },
  slotEmpty: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.limeGreen,
    backgroundColor: colors.limeTint,
  },
  slotText: { color: colors.deepGreen, fontSize: 14, fontWeight: font.bold },
  photoTag: {
    position: "absolute",
    left: 10,
    bottom: 10,
    maxWidth: "60%",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagVerified: { backgroundColor: colors.deepGreen },
  tagPlain: { backgroundColor: "rgba(255,255,255,0.92)" },
  photoTagText: { flexShrink: 1, color: colors.inkBlack, fontSize: 12, fontWeight: font.bold },
  photoTagTextLight: { color: colors.white },
  changePhoto: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(27,43,40,0.65)",
  },
  changePhotoText: { color: colors.white, fontSize: 12, fontWeight: font.bold },
  locations: { gap: 14 },
  locationCard: { gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: colors.softGray },
  locationHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  locationNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.deepGreen,
  },
  locationNumberText: { color: colors.white, fontSize: 13, fontWeight: font.bold },
  locationTitle: { flex: 1, color: colors.inkBlack, fontSize: 15, fontWeight: font.bold },
  locationName: { fontWeight: font.bold },
  locationCaption: { minHeight: 80 },
  pinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    // Android keeps a previous dashed style unless it is set explicitly
    borderStyle: "solid",
    borderColor: colors.border,
  },
  pinRowMissing: { borderStyle: "dashed", borderColor: colors.limeGreen, backgroundColor: colors.limeTint },
  pinTitle: { color: colors.inkBlack, fontSize: 14, fontWeight: font.bold },
  pinSub: { color: colors.textMuted, fontSize: 12, fontWeight: font.regular, marginTop: 1 },
  pinAction: { color: colors.deepGreen, fontSize: 13, fontWeight: font.bold },
  addLocation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.limeGreen,
  },
  addLocationText: { color: colors.deepGreen, fontSize: 15, fontWeight: font.bold },
  banner: { flexDirection: "row", gap: 12, marginTop: 18, padding: 14, borderRadius: radius.md },
  bannerVerified: { backgroundColor: colors.limeTint },
  bannerPlain: { backgroundColor: colors.softGray },
  bannerWarn: { backgroundColor: colors.errorBg },
  bannerTitle: { color: colors.inkBlack, fontSize: 14, fontWeight: font.bold },
  bannerBody: { color: colors.textMuted, fontSize: 13, lineHeight: 18, fontWeight: font.regular, marginTop: 2 },
  lockedPlace: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, backgroundColor: colors.softGray },
  lockedPlaceText: { color: colors.inkBlack, fontSize: 15, fontWeight: font.bold },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.deepGreen, borderColor: colors.deepGreen },
  chipText: { color: colors.inkBlack, fontSize: 14, fontWeight: font.regular },
  chipTextActive: { color: colors.white, fontWeight: font.bold },
  stepper: { flexDirection: "row", alignItems: "center", gap: 16 },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.limeTint,
  },
  stepValue: { color: colors.inkBlack, fontSize: 16, fontWeight: font.bold, minWidth: 80, textAlign: "center" },
});
