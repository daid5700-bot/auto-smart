export const ZALO_AUTH_FIELDS = [
  {
    key: "ZALO_APP_ID",
    label: "Zalo App ID",
    placeholder: "Nhập Zalo App ID...",
    inputType: "text",
  },
  {
    key: "ZALO_APP_SECRET",
    label: "Zalo App Secret Key",
    placeholder: "Nhập Zalo App Secret...",
    inputType: "password",
  },
  {
    key: "ZALO_OA_ACCESS_TOKEN",
    label: "Zalo Access Token",
    placeholder: "Nhập Zalo Access Token...",
    inputType: "textarea",
    fullWidth: true,
  },
  {
    key: "ZALO_REFRESH_TOKEN",
    label: "Zalo Refresh Token",
    placeholder: "Nhập Zalo Refresh Token...",
    inputType: "text",
    fullWidth: true,
  },
] as const;

export const ZALO_TEMPLATE_DEFINITIONS = [
  {
    key: "ZALO_TEMPLATE_THANK_YOU",
    label: "Template cảm ơn",
    logicalIds: ["CRM_THANK_YOU_001"],
  },
  {
    key: "ZALO_TEMPLATE_OIL_REMIND",
    label: "Template nhắc thay dầu",
    logicalIds: ["CRM_OIL_REMIND_002", "CRM_SERVICE_REMIND_002"],
  },
  {
    key: "ZALO_TEMPLATE_BIRTHDAY",
    label: "Template sinh nhật",
    logicalIds: ["CRM_BIRTHDAY_003"],
  },
  {
    key: "ZALO_TEMPLATE_INSPECT",
    label: "Template kiểm tra",
    logicalIds: ["CRM_INSPECT_004"],
  },
  {
    key: "ZALO_TEMPLATE_LOYALTY",
    label: "Template tích điểm",
    logicalIds: ["CRM_LOYALTY_005"],
    fallbackKeys: ["ZALO_TEMPLATE_THANK_YOU"],
  },
] as const;

export type ZaloCredentialKey =
  | (typeof ZALO_AUTH_FIELDS)[number]["key"]
  | (typeof ZALO_TEMPLATE_DEFINITIONS)[number]["key"];

export const ZALO_CREDENTIAL_KEYS: readonly ZaloCredentialKey[] = [
  ...ZALO_AUTH_FIELDS.map(({ key }) => key),
  ...ZALO_TEMPLATE_DEFINITIONS.map(({ key }) => key),
];

export type ZaloCredentialValues = Record<ZaloCredentialKey, string>;

export function createEmptyZaloCredentials(): ZaloCredentialValues {
  return Object.fromEntries(
    ZALO_CREDENTIAL_KEYS.map((key) => [key, ""]),
  ) as ZaloCredentialValues;
}

export function resolveZaloTemplateId(
  logicalTemplateId: string,
  credentials: Partial<ZaloCredentialValues>,
) {
  const definition = ZALO_TEMPLATE_DEFINITIONS.find(({ logicalIds }) =>
    logicalIds.some((id) => id === logicalTemplateId),
  );
  if (!definition) return logicalTemplateId;

  const fallbackKeys =
    "fallbackKeys" in definition ? definition.fallbackKeys : [];
  const candidateKeys: readonly ZaloCredentialKey[] = [
    definition.key,
    ...fallbackKeys,
  ];
  return (
    candidateKeys.map((key) => credentials[key]).find(Boolean) ||
    logicalTemplateId
  );
}
