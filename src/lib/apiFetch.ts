/** Same-origin API fetch that always sends the HttpOnly session cookie. */
export const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  fetch(input, {
    ...init,
    credentials: "include",
  });
