import {
  normalizeUsername,
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
}

export interface AccountAuthSuccess {
  ok: true;
  username: string;
  playerId: string;
  createdAt?: string;
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

export const fetchAccountStatus = async (
  playerId: string,
): Promise<AccountStatusResult> => {
  try {
    const search = new URLSearchParams({ playerId });
    const response = await fetch(
      `${API_BASE}/api/account/status?${search.toString()}`,
      { headers: { accept: "application/json" } },
    );

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
  } catch {
    return {
      ok: false,
      error: "Could not reach the account service.",
    };
  }
};

export const registerAccount = async (params: {
  username: string;
  password: string;
  playerId: string;
  acceptedTerms: boolean;
}): Promise<AccountApiResult> => {
  const usernameError = getUsernameValidationError(params.username);
  if (usernameError) {
    return { ok: false, error: usernameError, status: 400 };
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
    const response = await fetch(`${API_BASE}/api/account/register`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: normalizeUsername(params.username),
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
    const response = await fetch(`${API_BASE}/api/account/login`, {
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
    };
  } catch {
    return {
      ok: false,
      error: "Could not reach the account service.",
      status: 0,
    };
  }
};
