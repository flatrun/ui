import { addCollection } from "@iconify/vue";
import { icons } from "@iconify-json/lucide";

// Register the full lucide set once, offline, so <Icon> never hits the Iconify
// API (this panel may run without internet). The set is ~85KB gzipped; it can
// be subset later (e.g. unplugin-icons) if bundle size becomes a concern.
addCollection(icons);
