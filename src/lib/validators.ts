export const ID_RE = /^[a-z][a-z0-9]{3,15}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^01[016789]-\d{3,4}-\d{4}$/;
export const ZIP_RE = /^\d{5}$/;

export interface PasswordRule {
  len: boolean;
  mix: boolean;
  noSpace: boolean;
}

/** 8–20 chars, letters and digits mixed, no whitespace */
export function checkPassword(pw: string): PasswordRule {
  return {
    len: pw.length >= 8 && pw.length <= 20,
    mix: /[a-zA-Z]/.test(pw) && /\d/.test(pw),
    noSpace: !/\s/.test(pw),
  };
}

export const isPasswordOk = (pw: string): boolean => {
  const r = checkPassword(pw);
  return r.len && r.mix && r.noSpace;
};
