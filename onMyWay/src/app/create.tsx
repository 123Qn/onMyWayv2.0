import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { t } from "../i18n";
import { useAuth } from "../lib/AuthContext";
import type { PlaceCategory, PostKind } from "../lib/feed";
import { createPost, uploadPhoto, type NewPostStop } from "../lib/postsApi";
import { PermissionError, pickPhotos, takePhoto, type PostPhoto } from "../lib/verify";
import { LocationPicker, type Coords } from "../components/LocationPicker";
import { cn } from "../lib/cn";
import { colors } from "../lib/theme";
import { Chip, Img, Screen, SegmentedControl } from "../components/ui";

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
    <Screen className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="flex-row items-center justify-between border-b border-line px-3 py-2">
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t("create.discard")} hitSlop={8} className="h-10 w-10 items-center justify-center">
          <Ionicons name="close" size={26} color={colors.inkBlack} />
        </Pressable>
        <Text className="text-lg font-bold text-ink">{t("create.title")}</Text>
        <Pressable
          onPress={submit}
          disabled={!canPost || posting}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canPost }}
          className={cn("rounded-[18px] px-4.5 py-2 active:opacity-70", canPost ? "bg-deep-green" : "bg-line")}
        >
          {posting ? <ActivityIndicator size="small" color={colors.white} /> : <Text className="text-[15px] font-bold text-white">{t("create.post")}</Text>}
        </Pressable>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <ScrollView contentContainerClassName="p-5 pb-12" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <SegmentedControl
            value={kind}
            onChange={setKind}
            options={KINDS.map(({ kind: k, icon }) => ({ value: k, label: t(`create.kinds.${k}`), icon }))}
          />
          <Text className="mt-2 text-[13px] text-muted">{t(`create.kindHints.${kind}`)}</Text>

          {kind === "trip" ? (
            <>
              {/* 1. Header */}
              <Label>{t("create.tripTitle")}</Label>
              <TextInput
                className={cn(INPUT, "text-lg font-bold")}
                value={title}
                onChangeText={setTitle}
                placeholder={t("create.tripTitlePlaceholder")}
                placeholderTextColor={colors.textMuted}
                cursorColor={colors.deepGreen}
                maxLength={120}
              />

              {/* 2. Cover */}
              <Label>{t("create.cover")}</Label>
              <PhotoSlot
                photo={cover}
                loading={busy === "cover"}
                aspectRatio={16 / 10}
                emptyLabel={t("create.addCover")}
                emptyIcon="image"
                onPick={() => pickInto("cover", setCover)}
                showVerification={false}
              />
              <Text className={FIELD_HINT}>{t("create.coverHint")}</Text>

              {/* 3. Locations, repeated */}
              <Label>{t("create.locations")}</Label>
              <View className="gap-3.5">
                {locations.map((loc, i) => (
                  <View key={loc.key} className="gap-2.5 rounded-lg bg-soft-gray p-3.5">
                    <View className="flex-row items-center gap-2.5">
                      <View className="h-[26px] w-[26px] items-center justify-center rounded-full bg-deep-green">
                        <Text className="text-[13px] font-bold text-white">{i + 1}</Text>
                      </View>
                      <Text className="flex-1 text-[15px] font-bold text-ink">{t("create.locationN", { count: i + 1 })}</Text>
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
                      className={cn(INPUT, "font-bold")}
                      value={loc.name}
                      onChangeText={(v) => updateLocation(loc.key, { name: v })}
                      placeholder={t("create.locationNamePlaceholder")}
                      placeholderTextColor={colors.textMuted}
                      cursorColor={colors.deepGreen}
                      maxLength={100}
                    />
                    <TextInput
                      className={cn(INPUT, "min-h-20")}
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
                      // Android keeps a previous dashed border unless the style is set explicitly
                      className={cn(
                        "flex-row items-center gap-2.5 rounded-md border-[1.5px] p-3 active:opacity-70",
                        loc.pin ? "border-solid border-line bg-white" : "border-dashed border-lime-green bg-lime-tint"
                      )}
                    >
                      <Ionicons
                        name={loc.pin ? (loc.pin.fromPhoto ? "shield-checkmark" : "location") : "add-circle"}
                        size={20}
                        color={colors.deepGreen}
                      />
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-ink">
                          {loc.pin ? (loc.pin.fromPhoto ? t("create.pinFromPhoto") : t("create.pinManual")) : t("create.pinSet")}
                        </Text>
                        <Text className="mt-px text-xs text-muted">
                          {loc.pin ? `${loc.pin.latitude.toFixed(5)}, ${loc.pin.longitude.toFixed(5)}` : t("create.pinMissing")}
                        </Text>
                      </View>
                      <Text className="text-[13px] font-bold text-deep-green">{loc.pin ? t("create.pinEdit") : t("create.pinOpen")}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>

              {locations.length < MAX_LOCATIONS ? (
                <Pressable
                  onPress={() => setLocations((prev) => [...prev, newLocation()])}
                  accessibilityRole="button"
                  className="mt-3.5 flex-row items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed border-lime-green py-3.5 active:opacity-70"
                >
                  <Ionicons name="add-circle" size={22} color={colors.deepGreen} />
                  <Text className="text-[15px] font-bold text-deep-green">{t("create.addLocation")}</Text>
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
              <Label>{t("create.photo")}</Label>
              <PhotoSlot
                photo={momentPhoto}
                loading={busy === "moment"}
                aspectRatio={4 / 5}
                emptyLabel={t("create.takeMoment")}
                emptyIcon="camera"
                onPick={() => pickInto("moment", setMomentPhoto, "camera")}
                showVerification
              />
              <Text className={FIELD_HINT}>{t("create.momentHint")}</Text>
              {momentPhoto && !momentPhoto.verified ? (
                <Banner tone="warn" icon="warning" title={t("create.momentNoGpsTitle")} body={t("create.momentNoGpsBody")} />
              ) : null}
            </>
          ) : null}

          {hasProofPhoto && (kind !== "moment" || verified) ? (
            <Banner
              tone={verified ? "verified" : "plain"}
              icon={verified ? "shield-checkmark" : "information-circle"}
              title={
                verified
                  ? verifiedPlace
                    ? t("create.verifiedTitle", { place: verifiedPlace.name })
                    : t("create.verifiedHere")
                  : t("create.unverifiedTitle")
              }
              body={verified ? t("create.verifiedBody") : t("create.unverifiedBody")}
            />
          ) : null}

          {kind !== "trip" ? (
            <>
              <Label>{t("create.place")}</Label>
              {verifiedPlace ? (
                <View className={cn(INPUT, "flex-row flex-wrap items-center gap-2 bg-soft-gray")}>
                  <Ionicons name="location" size={18} color={colors.deepGreen} />
                  <Text className="text-[15px] font-bold text-ink">
                    {verifiedPlace.name}, {verifiedPlace.country}
                  </Text>
                  <Text className={FIELD_HINT}>{t("create.placeFromPhotos")}</Text>
                </View>
              ) : (
                <TextInput
                  className={INPUT}
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

          <Label>{kind === "trip" ? t("create.summary") : t("create.caption")}</Label>
          <TextInput
            className={cn(INPUT, "min-h-[100px]")}
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

          <Label>{t("create.category")}</Label>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip key={c} label={t(`feed.categories.${c}`)} active={c === category} onPress={() => setCategory(c)} />
            ))}
          </View>

          {kind === "trip" ? (
            <>
              <Label>{t("create.days")}</Label>
              <View className="flex-row items-center gap-4">
                <Pressable
                  onPress={() => setDays((d) => Math.max(1, d - 1))}
                  accessibilityRole="button"
                  accessibilityLabel={t("create.fewerDays")}
                  className="h-10 w-10 items-center justify-center rounded-full bg-lime-tint"
                >
                  <Ionicons name="remove" size={20} color={colors.deepGreen} />
                </Pressable>
                <Text className="min-w-20 text-center text-base font-bold text-ink">{t("create.daysValue", { count: days })}</Text>
                <Pressable
                  onPress={() => setDays((d) => Math.min(60, d + 1))}
                  accessibilityRole="button"
                  accessibilityLabel={t("create.moreDays")}
                  className="h-10 w-10 items-center justify-center rounded-full bg-lime-tint"
                >
                  <Ionicons name="add" size={20} color={colors.deepGreen} />
                </Pressable>
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const INPUT = "min-h-[50px] rounded-md border-[1.5px] border-line bg-white px-3.5 py-3 text-[15px] text-ink";
const FIELD_HINT = "mt-1.5 text-xs text-muted";

function Label({ children }: { children: ReactNode }) {
  return <Text className="mb-2 mt-[22px] text-[15px] font-bold text-ink">{children}</Text>;
}

/** Colored note under the photos: verified place, plain info, or a warning */
function Banner({
  tone,
  icon,
  title,
  body,
}: {
  tone: "verified" | "plain" | "warn";
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  const look = {
    verified: { bg: "bg-lime-tint", color: colors.deepGreen },
    plain: { bg: "bg-soft-gray", color: colors.textMuted },
    warn: { bg: "bg-error-bg", color: colors.error },
  }[tone];
  return (
    <View className={cn("mt-4.5 flex-row gap-3 rounded-md p-3.5", look.bg)}>
      <Ionicons name={icon} size={22} color={look.color} />
      <View className="flex-1">
        <Text className="text-sm font-bold text-ink">{title}</Text>
        <Text className="mt-0.5 text-[13px] leading-[18px] text-muted">{body}</Text>
      </View>
    </View>
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
  const slot = "w-full overflow-hidden rounded-md";
  const empty = "items-center justify-center gap-1.5 border-[1.5px] border-dashed border-lime-green bg-lime-tint";
  if (loading) {
    return (
      <View className={cn(slot, empty)} style={{ aspectRatio }}>
        <ActivityIndicator color={colors.deepGreen} />
        <Text className="text-sm font-bold text-deep-green">{t("create.locating")}</Text>
      </View>
    );
  }
  if (!photo) {
    return (
      <Pressable onPress={onPick} accessibilityRole="button" className={cn(slot, empty, "active:opacity-70")} style={{ aspectRatio }}>
        <Ionicons name={emptyIcon} size={28} color={colors.deepGreen} />
        <Text className="text-sm font-bold text-deep-green">{emptyLabel}</Text>
      </Pressable>
    );
  }
  return (
    <View className={cn(slot, "bg-soft-gray")} style={{ aspectRatio }}>
      <Img source={photo.uri} className="absolute inset-0" contentFit="cover" />
      {showVerification ? (
        <View
          className={cn(
            "absolute bottom-2.5 left-2.5 max-w-[60%] flex-row items-center gap-[5px] rounded-xl px-2 py-[5px]",
            photo.verified ? "bg-deep-green" : "bg-white/90"
          )}
        >
          <Ionicons name={photo.verified ? "shield-checkmark" : "help-circle"} size={13} color={photo.verified ? colors.white : colors.inkBlack} />
          <Text className={cn("shrink text-xs font-bold", photo.verified ? "text-white" : "text-ink")} numberOfLines={1}>
            {photo.verified ? (photo.place?.name ?? t("create.photoVerified")) : t("create.photoNoLocation")}
          </Text>
        </View>
      ) : null}
      <Pressable
        onPress={onPick}
        accessibilityRole="button"
        accessibilityLabel={t("create.changePhoto")}
        className="absolute bottom-2.5 right-2.5 flex-row items-center gap-[5px] rounded-[14px] bg-ink/65 px-2.5 py-1.5 active:opacity-70"
      >
        <Ionicons name="swap-horizontal" size={14} color={colors.white} />
        <Text className="text-xs font-bold text-white">{t("create.changePhoto")}</Text>
      </Pressable>
    </View>
  );
}
