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

export type IbanLiveStatus =
  | { kind: "empty" }
  | { kind: "incomplete"; message: string }
  | { kind: "invalid"; message: string }
  | { kind: "valid"; message: string };

export function liveValidateIban(iban: string): IbanLiveStatus {
  const trimmed = iban.trim();
  if (!trimmed) return { kind: "empty" };

  const normalized = normalizeIban(trimmed);

  if (!/^[A-Z0-9]*$/.test(normalized)) {
    return {
      kind: "invalid",
      message: "O IBAN só pode conter letras e números.",
    };
  }

  if (normalized.length < 2) {
    return {
      kind: "incomplete",
      message: "Indique o código do país (2 letras).",
    };
  }

  if (!/^[A-Z]{2}/.test(normalized)) {
    return {
      kind: "invalid",
      message: "O IBAN deve começar com 2 letras do país (ex. PT).",
    };
  }

  if (normalized.length < 4) {
    return {
      kind: "incomplete",
      message: "Indique os 2 dígitos de controlo após o país.",
    };
  }

  if (!/^[A-Z]{2}[0-9]{2}/.test(normalized)) {
    return {
      kind: "invalid",
      message: "Após o país devem seguir 2 dígitos de controlo.",
    };
  }

  if (normalized.length < 15) {
    return {
      kind: "incomplete",
      message: `Continuar… (${normalized.length}/15+ caracteres)`,
    };
  }

  if (normalized.length > 34) {
    return {
      kind: "invalid",
      message: "O IBAN não pode ter mais de 34 caracteres.",
    };
  }

  if (!isValidIban(normalized)) {
    return {
      kind: "invalid",
      message: "IBAN inválido (formato ou checksum).",
    };
  }

  return { kind: "valid", message: "IBAN válido." };
}
