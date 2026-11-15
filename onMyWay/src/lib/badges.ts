// The 100 badges. Names and descriptions live in i18n (rewards.badges / rewards.desc / rewards.specialDesc).
import type { Ionicons } from "@expo/vector-icons";

export type Rarity = "common" | "rare" | "epic" | "legendary";
export type BadgeCategory = "explorer" | "terrain" | "distance" | "creator" | "social" | "community" | "special";
export type Metric =
  | "countries"
  | "places"
  | "km"
  | "beach"
  | "island"
  | "mountain"
  | "city"
  | "food"
  | "nature"
  | "culture"
  | "trips"
  | "moments"
  | "followers"
  | "tookTrip"
  | "likes"
  | "helpful"
  | "months";
export type SpecialBadgeId =
  | "early_bird"
  | "night_owl"
  | "solo"
  | "squad"
  | "high_altitude"
  | "deep_dive"
  | "hop_3"
  | "road_trip"
  | "weekend"
  | "long_haul"
  | "equator"
  | "arctic"
  | "new_year"
  | "monsoon"
  | "founder";
export type BadgeId =
  | "countries_1"
  | "countries_3"
  | "countries_5"
  | "countries_10"
  | "countries_15"
  | "countries_20"
  | "countries_30"
  | "countries_50"
  | "places_1"
  | "places_5"
  | "places_10"
  | "places_25"
  | "places_50"
  | "places_100"
  | "places_200"
  | "places_500"
  | "km_100"
  | "km_500"
  | "km_1000"
  | "km_5000"
  | "km_10000"
  | "km_25000"
  | "km_40075"
  | "km_100000"
  | "beach_1"
  | "beach_5"
  | "beach_15"
  | "beach_30"
  | "island_1"
  | "island_5"
  | "island_15"
  | "island_30"
  | "mountain_1"
  | "mountain_5"
  | "mountain_15"
  | "mountain_30"
  | "city_1"
  | "city_5"
  | "city_15"
  | "city_30"
  | "food_1"
  | "food_5"
  | "food_15"
  | "food_30"
  | "nature_1"
  | "nature_5"
  | "nature_15"
  | "nature_30"
  | "culture_1"
  | "culture_5"
  | "culture_15"
  | "culture_30"
  | "trips_1"
  | "trips_5"
  | "trips_10"
  | "trips_25"
  | "trips_50"
  | "moments_1"
  | "moments_10"
  | "moments_50"
  | "moments_100"
  | "followers_10"
  | "followers_50"
  | "followers_100"
  | "followers_500"
  | "followers_1000"
  | "followers_5000"
  | "tookTrip_1"
  | "tookTrip_10"
  | "tookTrip_50"
  | "tookTrip_100"
  | "tookTrip_500"
  | "likes_100"
  | "likes_1000"
  | "likes_5000"
  | "likes_10000"
  | "helpful_1"
  | "helpful_10"
  | "helpful_25"
  | "helpful_50"
  | "helpful_100"
  | "months_3"
  | "months_6"
  | "months_12"
  | "months_24"
  | "early_bird"
  | "night_owl"
  | "solo"
  | "squad"
  | "high_altitude"
  | "deep_dive"
  | "hop_3"
  | "road_trip"
  | "weekend"
  | "long_haul"
  | "equator"
  | "arctic"
  | "new_year"
  | "monsoon"
  | "founder";

export type BadgeDef = {
  id: BadgeId;
  category: BadgeCategory;
  icon: keyof typeof Ionicons.glyphMap;
  rarity: Rarity;
  /** Counted badges unlock when metric >= goal; badges without a metric are one-off achievements */
  metric?: Metric;
  goal?: number;
};

export const BADGES: BadgeDef[] = [
  { id: "countries_1", category: "explorer", icon: "flag", rarity: "common", metric: "countries", goal: 1 },
  { id: "countries_3", category: "explorer", icon: "flag", rarity: "common", metric: "countries", goal: 3 },
  { id: "countries_5", category: "explorer", icon: "flag", rarity: "common", metric: "countries", goal: 5 },
  { id: "countries_10", category: "explorer", icon: "flag", rarity: "rare", metric: "countries", goal: 10 },
  { id: "countries_15", category: "explorer", icon: "flag", rarity: "rare", metric: "countries", goal: 15 },
  { id: "countries_20", category: "explorer", icon: "flag", rarity: "epic", metric: "countries", goal: 20 },
  { id: "countries_30", category: "explorer", icon: "flag", rarity: "epic", metric: "countries", goal: 30 },
  { id: "countries_50", category: "explorer", icon: "flag", rarity: "legendary", metric: "countries", goal: 50 },
  { id: "places_1", category: "explorer", icon: "location", rarity: "common", metric: "places", goal: 1 },
  { id: "places_5", category: "explorer", icon: "location", rarity: "common", metric: "places", goal: 5 },
  { id: "places_10", category: "explorer", icon: "location", rarity: "common", metric: "places", goal: 10 },
  { id: "places_25", category: "explorer", icon: "location", rarity: "rare", metric: "places", goal: 25 },
  { id: "places_50", category: "explorer", icon: "location", rarity: "rare", metric: "places", goal: 50 },
  { id: "places_100", category: "explorer", icon: "location", rarity: "epic", metric: "places", goal: 100 },
  { id: "places_200", category: "explorer", icon: "location", rarity: "epic", metric: "places", goal: 200 },
  { id: "places_500", category: "explorer", icon: "location", rarity: "legendary", metric: "places", goal: 500 },
  { id: "km_100", category: "distance", icon: "speedometer", rarity: "common", metric: "km", goal: 100 },
  { id: "km_500", category: "distance", icon: "speedometer", rarity: "common", metric: "km", goal: 500 },
  { id: "km_1000", category: "distance", icon: "speedometer", rarity: "common", metric: "km", goal: 1000 },
  { id: "km_5000", category: "distance", icon: "speedometer", rarity: "rare", metric: "km", goal: 5000 },
  { id: "km_10000", category: "distance", icon: "speedometer", rarity: "rare", metric: "km", goal: 10000 },
  { id: "km_25000", category: "distance", icon: "speedometer", rarity: "epic", metric: "km", goal: 25000 },
  { id: "km_40075", category: "distance", icon: "speedometer", rarity: "epic", metric: "km", goal: 40075 },
  { id: "km_100000", category: "distance", icon: "speedometer", rarity: "legendary", metric: "km", goal: 100000 },
  { id: "beach_1", category: "terrain", icon: "umbrella", rarity: "common", metric: "beach", goal: 1 },
  { id: "beach_5", category: "terrain", icon: "umbrella", rarity: "common", metric: "beach", goal: 5 },
  { id: "beach_15", category: "terrain", icon: "umbrella", rarity: "rare", metric: "beach", goal: 15 },
  { id: "beach_30", category: "terrain", icon: "umbrella", rarity: "legendary", metric: "beach", goal: 30 },
  { id: "island_1", category: "terrain", icon: "boat", rarity: "common", metric: "island", goal: 1 },
  { id: "island_5", category: "terrain", icon: "boat", rarity: "common", metric: "island", goal: 5 },
  { id: "island_15", category: "terrain", icon: "boat", rarity: "rare", metric: "island", goal: 15 },
  { id: "island_30", category: "terrain", icon: "boat", rarity: "legendary", metric: "island", goal: 30 },
  { id: "mountain_1", category: "terrain", icon: "triangle", rarity: "common", metric: "mountain", goal: 1 },
  { id: "mountain_5", category: "terrain", icon: "triangle", rarity: "common", metric: "mountain", goal: 5 },
  { id: "mountain_15", category: "terrain", icon: "triangle", rarity: "rare", metric: "mountain", goal: 15 },
  { id: "mountain_30", category: "terrain", icon: "triangle", rarity: "legendary", metric: "mountain", goal: 30 },
  { id: "city_1", category: "terrain", icon: "business", rarity: "common", metric: "city", goal: 1 },
  { id: "city_5", category: "terrain", icon: "business", rarity: "common", metric: "city", goal: 5 },
  { id: "city_15", category: "terrain", icon: "business", rarity: "rare", metric: "city", goal: 15 },
  { id: "city_30", category: "terrain", icon: "business", rarity: "legendary", metric: "city", goal: 30 },
  { id: "food_1", category: "terrain", icon: "restaurant", rarity: "common", metric: "food", goal: 1 },
  { id: "food_5", category: "terrain", icon: "restaurant", rarity: "common", metric: "food", goal: 5 },
  { id: "food_15", category: "terrain", icon: "restaurant", rarity: "rare", metric: "food", goal: 15 },
  { id: "food_30", category: "terrain", icon: "restaurant", rarity: "legendary", metric: "food", goal: 30 },
  { id: "nature_1", category: "terrain", icon: "leaf", rarity: "common", metric: "nature", goal: 1 },
  { id: "nature_5", category: "terrain", icon: "leaf", rarity: "common", metric: "nature", goal: 5 },
  { id: "nature_15", category: "terrain", icon: "leaf", rarity: "rare", metric: "nature", goal: 15 },
  { id: "nature_30", category: "terrain", icon: "leaf", rarity: "legendary", metric: "nature", goal: 30 },
  { id: "culture_1", category: "terrain", icon: "library", rarity: "common", metric: "culture", goal: 1 },
  { id: "culture_5", category: "terrain", icon: "library", rarity: "common", metric: "culture", goal: 5 },
  { id: "culture_15", category: "terrain", icon: "library", rarity: "rare", metric: "culture", goal: 15 },
  { id: "culture_30", category: "terrain", icon: "library", rarity: "legendary", metric: "culture", goal: 30 },
  { id: "trips_1", category: "creator", icon: "map", rarity: "common", metric: "trips", goal: 1 },
  { id: "trips_5", category: "creator", icon: "map", rarity: "common", metric: "trips", goal: 5 },
  { id: "trips_10", category: "creator", icon: "map", rarity: "rare", metric: "trips", goal: 10 },
  { id: "trips_25", category: "creator", icon: "map", rarity: "epic", metric: "trips", goal: 25 },
  { id: "trips_50", category: "creator", icon: "map", rarity: "legendary", metric: "trips", goal: 50 },
  { id: "moments_1", category: "creator", icon: "camera", rarity: "common", metric: "moments", goal: 1 },
  { id: "moments_10", category: "creator", icon: "camera", rarity: "common", metric: "moments", goal: 10 },
  { id: "moments_50", category: "creator", icon: "camera", rarity: "rare", metric: "moments", goal: 50 },
  { id: "moments_100", category: "creator", icon: "camera", rarity: "legendary", metric: "moments", goal: 100 },
  { id: "followers_10", category: "social", icon: "people", rarity: "common", metric: "followers", goal: 10 },
  { id: "followers_50", category: "social", icon: "people", rarity: "common", metric: "followers", goal: 50 },
  { id: "followers_100", category: "social", icon: "people", rarity: "rare", metric: "followers", goal: 100 },
  { id: "followers_500", category: "social", icon: "people", rarity: "rare", metric: "followers", goal: 500 },
  { id: "followers_1000", category: "social", icon: "people", rarity: "epic", metric: "followers", goal: 1000 },
  { id: "followers_5000", category: "social", icon: "people", rarity: "legendary", metric: "followers", goal: 5000 },
  { id: "tookTrip_1", category: "social", icon: "footsteps", rarity: "common", metric: "tookTrip", goal: 1 },
  { id: "tookTrip_10", category: "social", icon: "footsteps", rarity: "common", metric: "tookTrip", goal: 10 },
  { id: "tookTrip_50", category: "social", icon: "footsteps", rarity: "rare", metric: "tookTrip", goal: 50 },
  { id: "tookTrip_100", category: "social", icon: "footsteps", rarity: "epic", metric: "tookTrip", goal: 100 },
  { id: "tookTrip_500", category: "social", icon: "footsteps", rarity: "legendary", metric: "tookTrip", goal: 500 },
  { id: "likes_100", category: "social", icon: "heart", rarity: "common", metric: "likes", goal: 100 },
  { id: "likes_1000", category: "social", icon: "heart", rarity: "common", metric: "likes", goal: 1000 },
  { id: "likes_5000", category: "social", icon: "heart", rarity: "rare", metric: "likes", goal: 5000 },
  { id: "likes_10000", category: "social", icon: "heart", rarity: "legendary", metric: "likes", goal: 10000 },
  { id: "helpful_1", category: "community", icon: "chatbubbles", rarity: "common", metric: "helpful", goal: 1 },
  { id: "helpful_10", category: "community", icon: "chatbubbles", rarity: "common", metric: "helpful", goal: 10 },
  { id: "helpful_25", category: "community", icon: "chatbubbles", rarity: "rare", metric: "helpful", goal: 25 },
  { id: "helpful_50", category: "community", icon: "chatbubbles", rarity: "epic", metric: "helpful", goal: 50 },
  { id: "helpful_100", category: "community", icon: "chatbubbles", rarity: "legendary", metric: "helpful", goal: 100 },
  { id: "months_3", category: "community", icon: "calendar", rarity: "common", metric: "months", goal: 3 },
  { id: "months_6", category: "community", icon: "calendar", rarity: "common", metric: "months", goal: 6 },
  { id: "months_12", category: "community", icon: "calendar", rarity: "rare", metric: "months", goal: 12 },
  { id: "months_24", category: "community", icon: "calendar", rarity: "legendary", metric: "months", goal: 24 },
  { id: "early_bird", category: "special", icon: "partly-sunny", rarity: "rare" },
  { id: "night_owl", category: "special", icon: "moon", rarity: "rare" },
  { id: "solo", category: "special", icon: "person", rarity: "common" },
  { id: "squad", category: "special", icon: "people-circle", rarity: "rare" },
  { id: "high_altitude", category: "special", icon: "cloud", rarity: "epic" },
  { id: "deep_dive", category: "special", icon: "water", rarity: "rare" },
  { id: "hop_3", category: "special", icon: "boat", rarity: "rare" },
  { id: "road_trip", category: "special", icon: "car", rarity: "epic" },
  { id: "weekend", category: "special", icon: "cafe", rarity: "common" },
  { id: "long_haul", category: "special", icon: "airplane", rarity: "epic" },
  { id: "equator", category: "special", icon: "globe", rarity: "epic" },
  { id: "arctic", category: "special", icon: "snow", rarity: "legendary" },
  { id: "new_year", category: "special", icon: "sparkles", rarity: "rare" },
  { id: "monsoon", category: "special", icon: "rainy", rarity: "common" },
  { id: "founder", category: "special", icon: "rocket", rarity: "legendary" },
];
