import * as React from "react";

/**
 * Locally stored profile picture.
 *
 * The backend has no avatar field yet, so the URL returned by the upload
 * endpoint is kept in localStorage and read by Settings, the top bar and the
 * profile menu. Per-device by design: swap the storage for the API call once
 * the endpoint exists.
 */

export const PROFILE_IMAGE_STORAGE_KEY = "rankoya:profile-image";

/** Fired whenever the stored image changes, so open UI can re-read it. */
export const PROFILE_IMAGE_UPDATED_EVENT = "rankoya:profile-image-updated";

export function getProfileImage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PROFILE_IMAGE_STORAGE_KEY);
  } catch {
    // Private mode or blocked storage: fall back to initials.
    return null;
  }
}

export function setProfileImage(url: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_IMAGE_STORAGE_KEY, url);
  } catch {
    // Ignore quota or permission errors; the upload still succeeded.
  }
  window.dispatchEvent(new Event(PROFILE_IMAGE_UPDATED_EVENT));
}

export function clearProfileImage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROFILE_IMAGE_STORAGE_KEY);
  } catch {
    // Ignore.
  }
  window.dispatchEvent(new Event(PROFILE_IMAGE_UPDATED_EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PROFILE_IMAGE_STORAGE_KEY) onChange();
  };
  window.addEventListener(PROFILE_IMAGE_UPDATED_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PROFILE_IMAGE_UPDATED_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * The current profile image URL. Re-reads on our own update event and on
 * cross-tab `storage` events; null on the server so hydration agrees.
 */
export function useProfileImage(): string | null {
  return React.useSyncExternalStore(subscribe, getProfileImage, () => null);
}
