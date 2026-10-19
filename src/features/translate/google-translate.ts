/**
 * Machine translation through Google's free Website Translator, for the
 * languages Rankoya has no translation files for. Google translates the
 * rendered page in place; the choice lives in the `googtrans` cookie
 * (`/en/<code>`), which Google's script reads on every load.
 *
 * Rankoya's own languages (next-intl) always win: picking one clears the
 * cookie. Machine translation always starts from English.
 */

export const GOOGLE_TRANSLATE_SCRIPT_ID = "google-translate-script";
export const GOOGLE_TRANSLATE_CONTAINER_ID = "google_translate_element";
export const GOOGLE_TRANSLATE_INIT = "googleTranslateElementInit";
const COOKIE = "googtrans";
export const SOURCE_LANGUAGE = "en";

/**
 * Every language Google's Website Translator offers, using Google's codes
 * (not always ISO: Hebrew is `iw`, Simplified Chinese `zh-CN`). The most
 * used come first; the rest follow alphabetically by English name.
 */
export const GOOGLE_LANGUAGES: { code: string; short: string; native: string; english: string }[] = [
  { code: "es", short: "ES", native: "Español", english: "Spanish" },
  { code: "fr", short: "FR", native: "Français", english: "French" },
  { code: "de", short: "DE", native: "Deutsch", english: "German" },
  { code: "it", short: "IT", native: "Italiano", english: "Italian" },
  { code: "pt", short: "PT", native: "Português", english: "Portuguese" },
  { code: "nl", short: "NL", native: "Nederlands", english: "Dutch" },
  { code: "pl", short: "PL", native: "Polski", english: "Polish" },
  { code: "tr", short: "TR", native: "Türkçe", english: "Turkish" },
  { code: "ru", short: "RU", native: "Русский", english: "Russian" },
  { code: "zh-CN", short: "ZH", native: "简体中文", english: "Chinese (Simplified)" },
  { code: "ja", short: "JA", native: "日本語", english: "Japanese" },
  { code: "ko", short: "KO", native: "한국어", english: "Korean" },
  { code: "hi", short: "HI", native: "हिन्दी", english: "Hindi" },
  { code: "id", short: "ID", native: "Bahasa Indonesia", english: "Indonesian" },
  { code: "vi", short: "VI", native: "Tiếng Việt", english: "Vietnamese" },
  { code: "af", short: "AF", native: "Afrikaans", english: "Afrikaans" },
  { code: "sq", short: "SQ", native: "Shqip", english: "Albanian" },
  { code: "am", short: "AM", native: "አማርኛ", english: "Amharic" },
  { code: "hy", short: "HY", native: "Հայերեն", english: "Armenian" },
  { code: "as", short: "AS", native: "অসমীয়া", english: "Assamese" },
  { code: "ay", short: "AY", native: "Aymar aru", english: "Aymara" },
  { code: "az", short: "AZ", native: "Azərbaycanca", english: "Azerbaijani" },
  { code: "bm", short: "BM", native: "Bamanankan", english: "Bambara" },
  { code: "eu", short: "EU", native: "Euskara", english: "Basque" },
  { code: "be", short: "BE", native: "Беларуская", english: "Belarusian" },
  { code: "bn", short: "BN", native: "বাংলা", english: "Bengali" },
  { code: "bho", short: "BHO", native: "भोजपुरी", english: "Bhojpuri" },
  { code: "bs", short: "BS", native: "Bosanski", english: "Bosnian" },
  { code: "bg", short: "BG", native: "Български", english: "Bulgarian" },
  { code: "ca", short: "CA", native: "Català", english: "Catalan" },
  { code: "ceb", short: "CEB", native: "Cebuano", english: "Cebuano" },
  { code: "ny", short: "NY", native: "Chichewa", english: "Chichewa" },
  { code: "zh-TW", short: "ZH", native: "繁體中文", english: "Chinese (Traditional)" },
  { code: "co", short: "CO", native: "Corsu", english: "Corsican" },
  { code: "hr", short: "HR", native: "Hrvatski", english: "Croatian" },
  { code: "cs", short: "CS", native: "Čeština", english: "Czech" },
  { code: "da", short: "DA", native: "Dansk", english: "Danish" },
  { code: "dv", short: "DV", native: "ދިވެހި", english: "Dhivehi" },
  { code: "doi", short: "DOI", native: "डोगरी", english: "Dogri" },
  { code: "eo", short: "EO", native: "Esperanto", english: "Esperanto" },
  { code: "et", short: "ET", native: "Eesti", english: "Estonian" },
  { code: "ee", short: "EE", native: "Eʋegbe", english: "Ewe" },
  { code: "tl", short: "TL", native: "Filipino", english: "Filipino" },
  { code: "fi", short: "FI", native: "Suomi", english: "Finnish" },
  { code: "fy", short: "FY", native: "Frysk", english: "Frisian" },
  { code: "gl", short: "GL", native: "Galego", english: "Galician" },
  { code: "ka", short: "KA", native: "ქართული", english: "Georgian" },
  { code: "el", short: "EL", native: "Ελληνικά", english: "Greek" },
  { code: "gn", short: "GN", native: "Avañe'ẽ", english: "Guarani" },
  { code: "gu", short: "GU", native: "ગુજરાતી", english: "Gujarati" },
  { code: "ht", short: "HT", native: "Kreyòl ayisyen", english: "Haitian Creole" },
  { code: "ha", short: "HA", native: "Hausa", english: "Hausa" },
  { code: "haw", short: "HAW", native: "ʻŌlelo Hawaiʻi", english: "Hawaiian" },
  { code: "iw", short: "HE", native: "עברית", english: "Hebrew" },
  { code: "hmn", short: "HMN", native: "Hmoob", english: "Hmong" },
  { code: "hu", short: "HU", native: "Magyar", english: "Hungarian" },
  { code: "is", short: "IS", native: "Íslenska", english: "Icelandic" },
  { code: "ig", short: "IG", native: "Igbo", english: "Igbo" },
  { code: "ilo", short: "ILO", native: "Ilokano", english: "Ilocano" },
  { code: "ga", short: "GA", native: "Gaeilge", english: "Irish" },
  { code: "jw", short: "JV", native: "Basa Jawa", english: "Javanese" },
  { code: "kn", short: "KN", native: "ಕನ್ನಡ", english: "Kannada" },
  { code: "kk", short: "KK", native: "Қазақ тілі", english: "Kazakh" },
  { code: "km", short: "KM", native: "ខ្មែរ", english: "Khmer" },
  { code: "rw", short: "RW", native: "Kinyarwanda", english: "Kinyarwanda" },
  { code: "gom", short: "GOM", native: "कोंकणी", english: "Konkani" },
  { code: "kri", short: "KRI", native: "Krio", english: "Krio" },
  { code: "ku", short: "KU", native: "Kurdî", english: "Kurdish (Kurmanji)" },
  { code: "ckb", short: "CKB", native: "کوردی", english: "Kurdish (Sorani)" },
  { code: "ky", short: "KY", native: "Кыргызча", english: "Kyrgyz" },
  { code: "lo", short: "LO", native: "ລາວ", english: "Lao" },
  { code: "la", short: "LA", native: "Latina", english: "Latin" },
  { code: "lv", short: "LV", native: "Latviešu", english: "Latvian" },
  { code: "ln", short: "LN", native: "Lingála", english: "Lingala" },
  { code: "lt", short: "LT", native: "Lietuvių", english: "Lithuanian" },
  { code: "lg", short: "LG", native: "Luganda", english: "Luganda" },
  { code: "lb", short: "LB", native: "Lëtzebuergesch", english: "Luxembourgish" },
  { code: "mk", short: "MK", native: "Македонски", english: "Macedonian" },
  { code: "mai", short: "MAI", native: "मैथिली", english: "Maithili" },
  { code: "mg", short: "MG", native: "Malagasy", english: "Malagasy" },
  { code: "ms", short: "MS", native: "Bahasa Melayu", english: "Malay" },
  { code: "ml", short: "ML", native: "മലയാളം", english: "Malayalam" },
  { code: "mt", short: "MT", native: "Malti", english: "Maltese" },
  { code: "mi", short: "MI", native: "Māori", english: "Maori" },
  { code: "mr", short: "MR", native: "मराठी", english: "Marathi" },
  { code: "mni-Mtei", short: "MNI", native: "ꯃꯤꯇꯩꯂꯣꯟ", english: "Meiteilon (Manipuri)" },
  { code: "lus", short: "LUS", native: "Mizo ṭawng", english: "Mizo" },
  { code: "mn", short: "MN", native: "Монгол", english: "Mongolian" },
  { code: "my", short: "MY", native: "မြန်မာ", english: "Myanmar (Burmese)" },
  { code: "ne", short: "NE", native: "नेपाली", english: "Nepali" },
  { code: "no", short: "NO", native: "Norsk", english: "Norwegian" },
  { code: "or", short: "OR", native: "ଓଡ଼ିଆ", english: "Odia (Oriya)" },
  { code: "om", short: "OM", native: "Afaan Oromoo", english: "Oromo" },
  { code: "ps", short: "PS", native: "پښتو", english: "Pashto" },
  { code: "fa", short: "FA", native: "فارسی", english: "Persian" },
  { code: "pa", short: "PA", native: "ਪੰਜਾਬੀ", english: "Punjabi" },
  { code: "qu", short: "QU", native: "Runasimi", english: "Quechua" },
  { code: "ro", short: "RO", native: "Română", english: "Romanian" },
  { code: "sm", short: "SM", native: "Gagana Samoa", english: "Samoan" },
  { code: "sa", short: "SA", native: "संस्कृतम्", english: "Sanskrit" },
  { code: "gd", short: "GD", native: "Gàidhlig", english: "Scots Gaelic" },
  { code: "nso", short: "NSO", native: "Sepedi", english: "Sepedi" },
  { code: "sr", short: "SR", native: "Српски", english: "Serbian" },
  { code: "st", short: "ST", native: "Sesotho", english: "Sesotho" },
  { code: "sn", short: "SN", native: "chiShona", english: "Shona" },
  { code: "sd", short: "SD", native: "سنڌي", english: "Sindhi" },
  { code: "si", short: "SI", native: "සිංහල", english: "Sinhala" },
  { code: "sk", short: "SK", native: "Slovenčina", english: "Slovak" },
  { code: "sl", short: "SL", native: "Slovenščina", english: "Slovenian" },
  { code: "so", short: "SO", native: "Soomaali", english: "Somali" },
  { code: "su", short: "SU", native: "Basa Sunda", english: "Sundanese" },
  { code: "sw", short: "SW", native: "Kiswahili", english: "Swahili" },
  { code: "sv", short: "SV", native: "Svenska", english: "Swedish" },
  { code: "tg", short: "TG", native: "Тоҷикӣ", english: "Tajik" },
  { code: "ta", short: "TA", native: "தமிழ்", english: "Tamil" },
  { code: "tt", short: "TT", native: "Татарча", english: "Tatar" },
  { code: "te", short: "TE", native: "తెలుగు", english: "Telugu" },
  { code: "th", short: "TH", native: "ไทย", english: "Thai" },
  { code: "ti", short: "TI", native: "ትግርኛ", english: "Tigrinya" },
  { code: "ts", short: "TS", native: "Xitsonga", english: "Tsonga" },
  { code: "tk", short: "TK", native: "Türkmençe", english: "Turkmen" },
  { code: "ak", short: "AK", native: "Twi", english: "Twi (Akan)" },
  { code: "uk", short: "UK", native: "Українська", english: "Ukrainian" },
  { code: "ur", short: "UR", native: "اردو", english: "Urdu" },
  { code: "ug", short: "UG", native: "ئۇيغۇرچە", english: "Uyghur" },
  { code: "uz", short: "UZ", native: "Oʻzbekcha", english: "Uzbek" },
  { code: "cy", short: "CY", native: "Cymraeg", english: "Welsh" },
  { code: "xh", short: "XH", native: "isiXhosa", english: "Xhosa" },
  { code: "yi", short: "YI", native: "ייִדיש", english: "Yiddish" },
  { code: "yo", short: "YO", native: "Yorùbá", english: "Yoruba" },
  { code: "zu", short: "ZU", native: "isiZulu", english: "Zulu" },
];

export const googleLanguage = (code: string | null) => GOOGLE_LANGUAGES.find((l) => l.code === code) ?? null;

type TranslateElementCtor = new (options: { pageLanguage: string; autoDisplay: boolean }, id: string) => unknown;
declare global {
  interface Window {
    google?: { translate?: { TranslateElement?: TranslateElementCtor } };
    googleTranslateElementInit?: () => void;
  }
}

/** The language Google is translating into, or null when the page is as written. */
export function readGoogleLanguage(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
  const target = match ? decodeURIComponent(match[1]).split("/")[2] : "";
  return target && target !== SOURCE_LANGUAGE ? target : null;
}

/** Google sets the cookie on the bare host and on the parent domain; clear both. */
function writeCookie(value: string | null) {
  const host = window.location.hostname;
  const parent = host.split(".").slice(-2).join(".");
  const domains = ["", `; domain=${host}`, host.includes(".") ? `; domain=.${parent}` : ""];
  for (const domain of domains) {
    document.cookie =
      value === null
        ? `${COOKIE}=; path=/; max-age=0${domain}`
        : `${COOKIE}=${encodeURIComponent(value)}; path=/; max-age=31536000${domain}`;
  }
}

/** Remembers `code` for the next load without translating now. */
export function rememberGoogleLanguage(code: string) {
  writeCookie(`/${SOURCE_LANGUAGE}/${code}`);
}

/**
 * Translates the page into `code`. Drives Google's hidden select when the
 * widget has loaded; otherwise reloads, and the cookie applies on load.
 */
export function translatePageTo(code: string) {
  writeCookie(`/${SOURCE_LANGUAGE}/${code}`);
  const select = document.querySelector<HTMLSelectElement>("select.goog-te-combo");
  if (select) {
    select.value = code;
    select.dispatchEvent(new Event("change"));
  } else {
    window.location.reload();
  }
}

/** Back to the page as written. Google can't undo in place reliably, so this reloads. */
export function clearPageTranslation({ reload = true } = {}) {
  const wasTranslated = readGoogleLanguage() !== null;
  writeCookie(null);
  if (wasTranslated && reload) window.location.reload();
  return wasTranslated;
}
