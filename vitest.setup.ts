import { config } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import { messages } from "./src/i18n/index";

const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages,
});

config.global.plugins = [i18n];
