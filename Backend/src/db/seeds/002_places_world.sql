-- More destinations for the AI travel assistant: mountains, cities, culture, food and nature,
-- covering the countries travelers post about. Safe to re-run: existing slugs are updated.
-- best_months / season_notes are general guidance; review before production.
INSERT INTO places (name, slug, description, category, tags, country_code, region, city,
                    latitude, longitude, best_months, season_notes)
VALUES
  -- Vietnam
  ('Ha Long Bay', 'ha-long-bay-vn', 'Thousands of limestone karsts rising from emerald water; overnight cruises and kayaking.',
   'nature', '{cruise,kayaking,caves,island-hopping}', 'VN', 'Quang Ninh', 'Ha Long',
   20.910100, 107.183900, '{3,4,5,9,10,11}', 'Cool and misty Jan-Feb; typhoon risk Jul-Sep.'),
  ('Sa Pa', 'sa-pa-vn', 'Terraced rice fields, hill-tribe villages and Fansipan, the roof of Indochina.',
   'mountain', '{hiking,rice-terraces,culture,cable-car}', 'VN', 'Lao Cai', 'Sa Pa',
   22.336400, 103.843800, '{3,4,5,9,10}', 'Golden rice terraces in Sep; freezing fog possible Dec-Feb.'),
  ('Da Lat', 'da-lat-vn', 'Pine-covered highland town with cool weather, flower farms and cafes.',
   'mountain', '{cafes,pine-forest,flowers,cool-weather}', 'VN', 'Lam Dong', 'Da Lat',
   11.940400, 108.458300, '{12,1,2,3}', 'Dry and sunny Dec-Mar; afternoon rain May-Oct.'),
  ('Hoi An Ancient Town', 'hoi-an-vn', 'Lantern-lit old trading port with tailors, street food and riverside walks.',
   'culture', '{old-town,lanterns,street-food,tailors}', 'VN', 'Quang Nam', 'Hoi An',
   15.880100, 108.338000, '{2,3,4,5}', 'Floods possible Oct-Nov; very hot Jun-Aug.'),
  ('Saigon street food', 'saigon-street-food-vn', 'Night markets and alley stalls: banh mi, broken rice, pho and sugarcane juice.',
   'food', '{street-food,night-market,city,nightlife}', 'VN', 'Ho Chi Minh City', 'Ho Chi Minh City',
   10.772500, 106.698000, '{12,1,2,3,4}', 'Dry season Dec-Apr; short heavy showers May-Nov.'),
  ('Ninh Binh', 'ninh-binh-vn', 'Rivers through karst valleys by rowing boat, pagodas and the Hang Mua viewpoint.',
   'nature', '{boat-ride,karst,pagodas,cycling}', 'VN', 'Ninh Binh', 'Ninh Binh',
   20.250600, 105.974500, '{3,4,5,9,10}', 'Golden rice in late May-early Jun; hot and humid Jul-Aug.'),

  -- Thailand
  ('Chiang Mai', 'chiang-mai-th', 'Old city temples, night bazaars, cooking classes and mountain day trips.',
   'culture', '{temples,night-market,cooking-class,elephants}', 'TH', 'Chiang Mai', 'Chiang Mai',
   18.788300, 98.985300, '{11,12,1,2}', 'Cool and dry Nov-Feb; smoky haze Mar-Apr.'),
  ('Bangkok', 'bangkok-th', 'Grand temples, canal boats, rooftop bars and some of the best street food anywhere.',
   'city', '{street-food,temples,nightlife,shopping}', 'TH', 'Bangkok', 'Bangkok',
   13.756300, 100.501800, '{11,12,1,2}', 'Hottest Apr-May; rainy Jun-Oct.'),

  -- Indonesia
  ('Ubud', 'ubud-id', 'Rice terraces, jungle temples, yoga and crafts in the cultural heart of Bali.',
   'culture', '{rice-terraces,temples,yoga,crafts}', 'ID', 'Bali', 'Ubud',
   -8.506900, 115.262500, '{4,5,6,7,8,9}', 'Dry season Apr-Sep; rain usually in afternoons Nov-Mar.'),
  ('Mount Batur', 'mount-batur-id', 'Active volcano with a pre-dawn hike to watch sunrise over Lake Batur.',
   'mountain', '{hiking,sunrise,volcano}', 'ID', 'Bali', 'Kintamani',
   -8.242000, 115.375000, '{4,5,6,7,8,9}', 'Trails muddy and views cloudy in the wet season Dec-Feb.'),

  -- Japan
  ('Kyoto', 'kyoto-jp', 'Temples, shrines and geisha districts; famous for cherry blossom and autumn leaves.',
   'culture', '{temples,shrines,cherry-blossom,autumn-leaves}', 'JP', 'Kyoto', 'Kyoto',
   35.011600, 135.768100, '{3,4,10,11}', 'Cherry blossom late Mar-early Apr; autumn colors mid-Nov. Very busy then.'),
  ('Tokyo', 'tokyo-jp', 'Neon districts, food halls, museums and quiet gardens in a huge, easy-to-navigate city.',
   'city', '{food,nightlife,shopping,museums}', 'JP', 'Tokyo', 'Tokyo',
   35.676200, 139.650300, '{3,4,5,10,11}', 'Humid rainy season Jun-Jul; typhoons possible Aug-Sep.'),
  ('Osaka', 'osaka-jp', 'Japan''s kitchen: takoyaki, okonomiyaki and the neon canals of Dotonbori.',
   'food', '{street-food,nightlife,city}', 'JP', 'Osaka', 'Osaka',
   34.693700, 135.502300, '{3,4,5,10,11}', 'Hot and humid Jul-Aug.'),
  ('Mount Fuji', 'mount-fuji-jp', 'Japan''s iconic volcano; climbing season in summer, lake views year-round.',
   'mountain', '{hiking,lakes,views}', 'JP', 'Yamanashi', 'Fujikawaguchiko',
   35.360600, 138.727400, '{7,8,10,11,12}', 'Summit trails open only Jul-early Sep; clearest views in winter.'),

  -- South Korea
  ('Seoul', 'seoul-kr', 'Palaces, night markets, cafes and K-culture with an excellent subway.',
   'city', '{palaces,street-food,shopping,nightlife}', 'KR', 'Seoul', 'Seoul',
   37.566500, 126.978000, '{4,5,9,10}', 'Cherry blossom early Apr; autumn leaves Oct; very cold Jan.'),
  ('Jeju Island', 'jeju-kr', 'Volcanic island with lava tubes, waterfalls, beaches and the Hallasan hike.',
   'island', '{hiking,beach,volcano,waterfalls}', 'KR', 'Jeju', 'Jeju',
   33.499600, 126.531200, '{4,5,6,9,10}', 'Rainy season late Jun-Jul; windy winters.'),

  -- France
  ('Paris', 'paris-fr', 'Museums, cafes and river walks; the Eiffel Tower sparkles on the hour after dark.',
   'city', '{museums,cafes,architecture,romantic}', 'FR', 'Ile-de-France', 'Paris',
   48.856600, 2.352200, '{4,5,6,9,10}', 'Crowded and hot Jul-Aug; many locals away in August.'),
  ('Chamonix', 'chamonix-fr', 'Alpine town under Mont Blanc: cable cars, glaciers, skiing and summer hiking.',
   'mountain', '{hiking,skiing,glaciers,cable-car}', 'FR', 'Auvergne-Rhone-Alpes', 'Chamonix',
   45.923700, 6.869400, '{1,2,3,6,7,8,9}', 'Ski season Dec-Apr; hiking season Jun-Sep.'),

  -- Italy
  ('Rome', 'rome-it', 'Ancient ruins, Vatican art, piazzas and long dinners of pasta.',
   'culture', '{history,museums,food,architecture}', 'IT', 'Lazio', 'Rome',
   41.902800, 12.496400, '{4,5,9,10}', 'Very hot and crowded Jul-Aug.'),
  ('Cinque Terre', 'cinque-terre-it', 'Five colorful cliffside villages linked by coastal trails and a train.',
   'nature', '{hiking,coastal-walk,villages,seafood}', 'IT', 'Liguria', 'La Spezia',
   44.127100, 9.708000, '{4,5,6,9,10}', 'Trails can close after heavy rain; packed in summer.'),
  ('Dolomites', 'dolomites-it', 'Jagged peaks, alpine lakes like Lago di Braies and hut-to-hut hiking.',
   'mountain', '{hiking,lakes,skiing,via-ferrata}', 'IT', 'Trentino-Alto Adige', 'Cortina d''Ampezzo',
   46.410200, 11.844000, '{1,2,3,6,7,8,9}', 'Hiking Jun-Sep; skiing Dec-Mar; many huts closed in between.'),

  -- Germany / Switzerland
  ('Berlin', 'berlin-de', 'History, street art, museums and nightlife in a laid-back capital.',
   'city', '{history,museums,nightlife,street-art}', 'DE', 'Berlin', 'Berlin',
   52.520000, 13.405000, '{5,6,7,8,9,12}', 'Christmas markets in December; grey and cold Jan-Feb.'),
  ('Rothenburg ob der Tauber', 'rothenburg-de', 'Fairy-tale medieval town with an intact wall you can walk around.',
   'culture', '{old-town,medieval,christmas-market}', 'DE', 'Bavaria', 'Rothenburg ob der Tauber',
   49.377200, 10.179200, '{5,6,9,12}', 'Famous Christmas market in December.'),
  ('Lauterbrunnen', 'lauterbrunnen-ch', 'Valley of 72 waterfalls under the Jungfrau, with trains up to the peaks.',
   'nature', '{waterfalls,hiking,trains,alps}', 'CH', 'Bern', 'Lauterbrunnen',
   46.593500, 7.909100, '{6,7,8,9}', 'Snow closes higher trails Nov-May.'),

  -- United Kingdom
  ('London', 'london-gb', 'Free world-class museums, markets, parks and theatre.',
   'city', '{museums,markets,theatre,history}', 'GB', 'England', 'London',
   51.507400, -0.127800, '{5,6,7,8,9}', 'Mild summers; short grey days Nov-Feb.'),
  ('Scottish Highlands', 'scottish-highlands-gb', 'Lochs, glens and castles; road trips and long hikes.',
   'nature', '{road-trip,hiking,castles,lochs}', 'GB', 'Scotland', 'Fort William',
   56.819800, -5.105200, '{5,6,7,8,9}', 'Midges in summer; many places close in winter.'),

  -- United States
  ('New York City', 'new-york-us', 'Skyline views, museums, Central Park and food from every country.',
   'city', '{museums,food,nightlife,shopping}', 'US', 'New York', 'New York',
   40.712800, -74.006000, '{4,5,6,9,10,12}', 'Holiday lights in December; very cold Jan-Feb; humid Jul-Aug.'),
  ('Grand Canyon', 'grand-canyon-us', 'A mile-deep canyon with rim viewpoints and tough hikes to the river.',
   'nature', '{hiking,views,road-trip}', 'US', 'Arizona', 'Grand Canyon Village',
   36.106900, -112.112900, '{3,4,5,9,10}', 'Inner canyon dangerously hot in summer; North Rim closed in winter.'),

  -- Brazil / Chile
  ('Rio de Janeiro', 'rio-de-janeiro-br', 'Sugarloaf and Christ the Redeemer above beaches like Copacabana and Ipanema.',
   'city', '{beach,views,nightlife,samba}', 'BR', 'Rio de Janeiro', 'Rio de Janeiro',
   -22.906800, -43.172900, '{4,5,6,9,10}', 'Carnival in Feb-Mar is spectacular but crowded and pricey.'),
  ('Torres del Paine', 'torres-del-paine-cl', 'Granite towers, glaciers and the famous W trek in Patagonia.',
   'mountain', '{hiking,glaciers,camping,patagonia}', 'CL', 'Magallanes', 'Puerto Natales',
   -50.942300, -72.966200, '{11,12,1,2,3}', 'Trekking season Nov-Mar; very windy; book refugios early.'),

  -- Australia / Maldives
  ('Blue Mountains', 'blue-mountains-au', 'Eucalyptus valleys, the Three Sisters and bushwalks two hours from Sydney.',
   'mountain', '{hiking,views,camping,family}', 'AU', 'New South Wales', 'Katoomba',
   -33.712000, 150.311900, '{3,4,5,9,10,11}', 'Bushfire risk in hot summers; cold nights in winter.'),
  ('Maldives', 'maldives-mv', 'Overwater villas, house reefs with turtles and some of the clearest water on Earth.',
   'island', '{snorkeling,diving,honeymoon,beach}', 'MV', 'Kaafu', 'Male',
   4.175500, 73.509300, '{12,1,2,3,4}', 'Dry season Dec-Apr; southwest monsoon brings rain May-Nov.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  country_code = EXCLUDED.country_code,
  region = EXCLUDED.region,
  city = EXCLUDED.city,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  best_months = EXCLUDED.best_months,
  season_notes = EXCLUDED.season_notes;
