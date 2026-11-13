/** Returns null unless the value is an absolute http(s) URL. */
export function parseHttpUrl(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Key used to detect the same quiz submitted twice: ignores the scheme, a leading
 * "www.", the fragment, a trailing slash and the order of query parameters.
 */
export function urlKey(value) {
  const url = parseHttpUrl(value);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const port = url.port ? `:${url.port}` : "";
  const path = url.pathname.replace(/\/+$/, "");
  const params = [...url.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${host}${port}${path}${params ? `?${params}` : ""}`;
}
