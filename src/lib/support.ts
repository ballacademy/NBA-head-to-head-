/** Public support contact for beta + legal flows. */
export const SUPPORT_EMAIL = "ballacademyofficial@gmail.com";

/** Player / salary data freshness shown in beta notes. */
export const STATS_DATA_AS_OF_LABEL = "July 15, 2026";
export const SALARIES_DATA_AS_OF_LABEL = "July 30, 2026";

export const buildSupportMailto = (params?: {
  subject?: string;
  body?: string;
}) => {
  const search = new URLSearchParams();
  search.set(
    "subject",
    params?.subject?.trim() || "Draft Day GM beta feedback",
  );
  if (params?.body?.trim()) {
    search.set("body", params.body.trim());
  }

  return `mailto:${SUPPORT_EMAIL}?${search.toString()}`;
};

export const buildBugReportMailto = (details?: string) =>
  buildSupportMailto({
    subject: "Draft Day GM bug report",
    body: [
      "What happened:",
      "",
      "What you expected:",
      "",
      "Device / browser:",
      "",
      details?.trim() ? `Technical details:\n${details.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });
