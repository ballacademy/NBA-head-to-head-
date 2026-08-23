import { apiFetch } from "./apiFetch";
import {
  normalizeUsername,
  normalizeEmail,
  getEmailValidationError,
  getPasswordValidationError,
  getUsernameValidationError,
} from "./accountCredentials";

const API_BASE = "";

export interface AccountStatusResponse {
  linked: boolean;
  playerId: string;
  username?: string;
  createdAt?: string;
  lastLoginAt?: string | null;
  signupIndex?: number | null;
  foundingGm?: boolean;
}

export interface AccountAuthSuccess {
  ok: true;
  username: string;
  playerId: string;
  createdAt?: string;
  signupIndex?: number | null;
  foundingGm?: boolean;
}

export type AccountApiResult =
  | AccountAuthSuccess
  | { ok: false; error: string; status: number };

const readError = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error?.trim()) {
      return body.error.trim();
    }
  } catch {
    // fall through
  }

  return "Something went wrong. Try again.";
};

export type AccountStatusResult =
  | { ok: true; status: AccountStatusResponse }
  | { ok: false; error: string };

export const ACCOUNT_STATUS_TIMEOUT_MS = 10_000;

export const logoutAccount = async (): Promise<{ ok: true } | { ok: false }> => {
  try {
    const response = await apiFetch(`${API_BASE}/api/account/logout`, {
      method: "POST",
      headers: { accept: "application/json" },
    });
    return response.ok ? { ok: true } : { ok: false };
  } catch {
    return { ok: false };
  }
};

export const fetchAccountStatus = async (
  playerId: string,
  options: { timeoutMs?: number } = {},
): Promise<AccountStatusResult> => {
  const timeoutMs = options.timeoutMs ?? ACCOUNT_STATUS_TIMEOUT_MS;

  try {
    const search = new URLSearchParams({ playerId });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await apiFetch(
        `${API_BASE}/api/account/status?${search.toString()}`,
        {
          headers: { accept: "application/json" },
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      return {
        ok: false,
        error: await readError(response),
      };
    }

    return {
      ok: true,
      status: (await response.json()) as AccountStatusResponse,
    };
  } catch (error) {
    const aborted =
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError");

    return {
      ok: false,
      error: aborted
        ? "Account check timed out. Tap Retry."
        : "Could not reach the account service.",
    };
  }
};

export const registerAccount = async (params: {
  username: string;
  email: string;
  password: string;
  playerId: string;
  acceptedTerms: boolean;
}): Promise<AccountApiResult> => {
  const usernameError = getUsernameValidationError(params.username);
  if (usernameError) {
    return { ok: false, error: usernameError, status: 400 };
  }

  const emailError = getEmailValidationError(params.email);
  if (emailError) {
    return { ok: false, error: emailError, status: 400 };
  }

  const passwordError = getPasswordValidationError(params.password);
  if (passwordError) {
    return { ok: false, error: passwordError, status: 400 };
  }

  if (!params.acceptedTerms) {
    return {
      ok: false,
      error: "You must accept the Privacy Policy and Terms of Use.",
      status: 400,
    };
  }

  try {
    const response = await apiFetch(`${API_BASE}/api/account/register`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: normalizeUsername(params.username),
        email: normalizeEmail(params.email),
        password: params.password,
        playerId: params.playerId,
        acceptedTerms: true,
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: await readError(response),
        status: response.status,
      };
    }

    const body = (await response.json()) as AccountAuthSuccess;
    return {
      ok: true,
      username: body.username,
      playerId: body.playerId,
      createdAt: body.createdAt,
      signupIndex: body.signupIndex,
      foundingGm: Boolean(body.foundingGm),
    };
  } catch {
    return {
      ok: false,
      error: "Could not reach the account service.",
      status: 0,
    };
  }
};

export const loginAccount = async (params: {
  username: string;
  password: string;
}): Promise<AccountApiResult> => {
  const usernameError = getUsernameValidationError(params.username);
  if (usernameError) {
    return { ok: false, error: usernameError, status: 400 };
  }

  const passwordError = getPasswordValidationError(params.password);
  if (passwordError) {
    return { ok: false, error: passwordError, status: 400 };
  }

  try {
    const response = await apiFetch(`${API_BASE}/api/account/login`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: normalizeUsername(params.username),
        password: params.password,
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: await readError(response),
        status: response.status,
      };
    }

    const body = (await response.json()) as AccountAuthSuccess;
    return {
      ok: true,
      username: body.username,
      playerId: body.playerId,
      signupIndex: body.signupIndex,
      foundingGm: Boolean(body.foundingGm),
    };
  } catch {
    return {
      ok: false,
      error: "Could not reach the account service.",
      status: 0,
    };
  }
};

export type RequestPasswordResetResult =
  | { ok: true; message: string }
  | { ok: false; error: string; status: number };

export const requestPasswordReset = async (
  username: string,
): Promise<RequestPasswordResetResult> => {
  const usernameError = getUsernameValidationError(username);
  if (usernameError) {
    return { ok: false, error: usernameError, status: 400 };
  }

  try {
    const response = await apiFetch(`${API_BASE}/api/account/request-reset`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: normalizeUsername(username),
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: await readError(response),
        status: response.status,
      };
    }

    const body = (await response.json()) as { message?: string };
    return {
      ok: true,
      message:
        body.message?.trim() ||
        "If that username has an email on file, a reset code is on the way. Check your inbox (and spam folder).",
    };
  } catch {
    return {
      ok: false,
      error: "Could not reach the account service.",
      status: 0,
    };
  }
};

export const resetAccountPassword = async (params: {
  username: string;
  resetCode: string;
  password: string;
}): Promise<AccountApiResult> => {
  const usernameError = getUsernameValidationError(params.username);
  if (usernameError) {
    return { ok: false, error: usernameError, status: 400 };
  }

  const passwordError = getPasswordValidationError(params.password);
  if (passwordError) {
    return { ok: false, error: passwordError, status: 400 };
  }

  const code = params.resetCode.trim().toLowerCase().replace(/[\s-]+/g, "");
  if (!/^[a-f0-9]{8}$/.test(code)) {
    return {
      ok: false,
      error: "Enter the 8-character reset code from support.",
      status: 400,
    };
  }

  try {
    const response = await apiFetch(`${API_BASE}/api/account/reset-password`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: normalizeUsername(params.username),
        resetCode: code,
        password: params.password,
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: await readError(response),
        status: response.status,
      };
    }

    const body = (await response.json()) as { username?: string };
    return {
      ok: true,
      username: body.username ?? normalizeUsername(params.username),
      playerId: "",
    };
  } catch {
    return {
      ok: false,
      error: "Could not reach the account service.",
      status: 0,
    };
  }
};
