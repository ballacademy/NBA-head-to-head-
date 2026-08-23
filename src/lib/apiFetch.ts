/** Same-origin API fetch that always sends the HttpOnly session cookie. */
export const apiFetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
) => {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
  });

  if (response.status === 401) {
    // Lazy import avoids a cycle with accountGate → accountApi → apiFetch.
    const { clearAccountLinkCache } = await import("./accountGate");
    clearAccountLinkCache();
  }

  return response;
};
