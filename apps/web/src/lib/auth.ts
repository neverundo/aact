import { apiFetch } from "./api";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  platform_role: string | null;
  is_admin: boolean;
  mfa: {
    totp_enabled: boolean;
    email_otp_enabled: boolean;
    recovery_codes_remaining: number;
  };
  session: {
    fully_authenticated: boolean;
    mfa_setup_only: boolean;
    step_up_active: boolean;
  };
  memberships?: Array<{
    business_id: number;
    role: string;
    status: string;
  }>;
};

export type LoginResponse =
  | {
      status: "authenticated" | "mfa_setup_required";
      user: AuthUser;
    }
  | {
      status: "mfa_required";
      challenge_id: number;
      challenge_token: string;
      methods: string[];
      expires_at: string;
    };

export async function fetchMe(): Promise<AuthUser> {
  const response = await apiFetch<{ data: AuthUser }>("/api/v1/auth/me");
  return response.data;
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function verifyMfa(input: {
  challenge_token: string;
  method: string;
  code: string;
}): Promise<{ status: string; user: AuthUser }> {
  return apiFetch("/api/v1/auth/mfa/verify", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logout(): Promise<void> {
  await apiFetch("/api/v1/auth/logout", { method: "POST" });
}
