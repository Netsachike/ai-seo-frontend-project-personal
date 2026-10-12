import type { CreatePublishingConnectionPayload, PublishingPlatform } from "@/types/types";

/** The publishing platforms the backend connects through its API (WordPress.com uses OAuth instead). */
export const PUBLISHING_PLATFORMS = [
  "wordpress",
  "shopify",
  "webflow",
  "wix",
  "ghost",
] as const satisfies readonly PublishingPlatform[];
export type ApiPublishingPlatform = (typeof PUBLISHING_PLATFORMS)[number];

export const isPublishingPlatform = (value: string): value is ApiPublishingPlatform =>
  (PUBLISHING_PLATFORMS as readonly string[]).includes(value);

type CredentialKey = keyof NonNullable<CreatePublishingConnectionPayload["credentials"]>;
type ConfigKey = keyof NonNullable<CreatePublishingConnectionPayload["config"]>;

export type PublishingField = {
  /** Where the value goes in the request body. */
  group: "credentials" | "config";
  key: CredentialKey | ConfigKey;
  /** Message key under integrations.fields */
  label:
    | "siteUrl"
    | "username"
    | "applicationPassword"
    | "storeDomain"
    | "accessToken"
    | "collectionId"
    | "wixSiteId"
    | "adminApiKey";
  input: "url" | "text" | "secret";
};

/** Required keys per platform when `method = api`, from the backend contract. */
export const PUBLISHING_FIELDS: Record<ApiPublishingPlatform, PublishingField[]> = {
  wordpress: [
    { group: "credentials", key: "site_url", label: "siteUrl", input: "url" },
    { group: "credentials", key: "username", label: "username", input: "text" },
    { group: "credentials", key: "application_password", label: "applicationPassword", input: "secret" },
  ],
  shopify: [
    { group: "credentials", key: "store_domain", label: "storeDomain", input: "text" },
    { group: "credentials", key: "access_token", label: "accessToken", input: "secret" },
  ],
  webflow: [
    { group: "credentials", key: "access_token", label: "accessToken", input: "secret" },
    { group: "config", key: "collection_id", label: "collectionId", input: "text" },
  ],
  wix: [
    { group: "credentials", key: "access_token", label: "accessToken", input: "secret" },
    { group: "credentials", key: "site_id", label: "wixSiteId", input: "text" },
  ],
  ghost: [
    { group: "config", key: "site_url", label: "siteUrl", input: "url" },
    { group: "credentials", key: "admin_api_key", label: "adminApiKey", input: "secret" },
  ],
};

/** Builds the create-connection body from the form values. URLs get https:// when typed bare. */
export function connectionPayload(
  platform: ApiPublishingPlatform,
  name: string,
  values: Record<string, string>,
): CreatePublishingConnectionPayload {
  const credentials: Record<string, string> = {};
  const config: Record<string, string> = {};
  for (const field of PUBLISHING_FIELDS[platform]) {
    let value = (values[field.key] ?? "").trim();
    if (field.input === "url" && value && !/^https?:\/\//.test(value)) value = `https://${value}`;
    (field.group === "credentials" ? credentials : config)[field.key] = value;
  }
  return {
    name,
    platform,
    method: "api",
    credentials,
    config: Object.keys(config).length ? config : null,
  };
}
