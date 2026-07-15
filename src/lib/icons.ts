import { addCollection } from "@iconify/vue";
import { icons } from "@iconify-json/lucide";
import { solarSubset } from "./solar-icons";

// Register the full lucide set once, offline, so <Icon> never hits the Iconify
// API (this panel may run without internet). The set is ~85KB gzipped; it can
// be subset later (e.g. unplugin-icons) if bundle size becomes a concern.
addCollection(icons);

// Solar's filled and duotone glyphs carry weight lucide's hairlines cannot at small sizes.
// Only the icons the app renders are compiled in: importing the published set would put its
// whole 6MB of JSON in the bundle. See scripts/build-solar-icons.mjs.
addCollection(solarSubset);
