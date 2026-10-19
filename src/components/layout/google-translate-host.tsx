"use client";

import * as React from "react";

import {
  GOOGLE_TRANSLATE_CONTAINER_ID,
  GOOGLE_TRANSLATE_INIT,
  GOOGLE_TRANSLATE_SCRIPT_ID,
  readGoogleLanguage,
  SOURCE_LANGUAGE,
} from "@/features/translate/google-translate";

/**
 * Loads Google's Website Translator once, and only when a machine language
 * is chosen, so pages in Rankoya's own languages never load Google's script.
 * Google's own UI stays hidden (globals.css); the language menu drives it.
 */
export function GoogleTranslateHost() {
  React.useEffect(() => {
    if (!readGoogleLanguage() || document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID)) return;
    window[GOOGLE_TRANSLATE_INIT] = () => {
      const TranslateElement = window.google?.translate?.TranslateElement;
      if (TranslateElement)
        new TranslateElement({ pageLanguage: SOURCE_LANGUAGE, autoDisplay: false }, GOOGLE_TRANSLATE_CONTAINER_ID);
    };
    const script = document.createElement("script");
    script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
    // `cb` must name the global defined above.
    script.src = `https://translate.google.com/translate_a/element.js?cb=${GOOGLE_TRANSLATE_INIT}`;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return <div id={GOOGLE_TRANSLATE_CONTAINER_ID} className="invisible absolute" aria-hidden />;
}
