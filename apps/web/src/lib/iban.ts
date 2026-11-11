/** Mirrors apps/api/app/Support/Iban.php */

export function normalizeIban(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase();
}

/** Uppercase letters; keep digits and spaces for typing comfort. */
export function formatIbanInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9\s]/g, "");
}

function mod97(numeric: string): number {
  let checksum = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const chunk = numeric.slice(i, i + 7);
    checksum = Number(`${checksum}${chunk}`) % 97;
  }
  return checksum;
}

export function isValidIban(iban: string): boolean {
  const normalized = normalizeIban(iban);

  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(normalized)) {
    return false;
  }

  const rearranged = `${normalized.slice(4)}${normalized.slice(0, 4)}`;
  let numeric = "";
  for (const char of rearranged) {
    numeric +=
      char >= "A" && char <= "Z" ? String(char.charCodeAt(0) - 55) : char;
  }

  return mod97(numeric) === 1;
}

export type IbanMessageKey =
  | "lettersNumbersOnly"
  | "countryCode"
  | "mustStartWithCountry"
  | "checkDigits"
  | "checkDigitsInvalid"
  | "continueTyping"
  | "tooLong"
  | "invalid"
  | "valid"
  | "required";

export type IbanLiveStatus =
  | { kind: "empty" }
  | {
      kind: "incomplete";
      messageKey: IbanMessageKey;
      values?: Record<string, string | number>;
    }
  | {
      kind: "invalid";
      messageKey: IbanMessageKey;
      values?: Record<string, string | number>;
    }
  | {
      kind: "valid";
      messageKey: IbanMessageKey;
      values?: Record<string, string | number>;
    };

export function liveValidateIban(iban: string): IbanLiveStatus {
  const trimmed = iban.trim();
  if (!trimmed) return { kind: "empty" };

  const normalized = normalizeIban(trimmed);

  if (!/^[A-Z0-9]*$/.test(normalized)) {
    return {
      kind: "invalid",
      messageKey: "lettersNumbersOnly",
    };
  }

  if (normalized.length < 2) {
    return {
      kind: "incomplete",
      messageKey: "countryCode",
    };
  }

  if (!/^[A-Z]{2}/.test(normalized)) {
    return {
      kind: "invalid",
      messageKey: "mustStartWithCountry",
    };
  }

  if (normalized.length < 4) {
    return {
      kind: "incomplete",
      messageKey: "checkDigits",
    };
  }

  if (!/^[A-Z]{2}[0-9]{2}/.test(normalized)) {
    return {
      kind: "invalid",
      messageKey: "checkDigitsInvalid",
    };
  }

  if (normalized.length < 15) {
    return {
      kind: "incomplete",
      messageKey: "continueTyping",
      values: { length: normalized.length },
    };
  }

  if (normalized.length > 34) {
    return {
      kind: "invalid",
      messageKey: "tooLong",
    };
  }

  if (!isValidIban(normalized)) {
    return {
      kind: "invalid",
      messageKey: "invalid",
    };
  }

  return { kind: "valid", messageKey: "valid" };
}
