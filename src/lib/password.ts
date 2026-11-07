export const PASSWORD_HINT = "Password minimal 8 karakter dan harus mengandung huruf dan angka";
export const passwordOk = (p: unknown): p is string => typeof p === "string" && p.length >= 8 && p.length <= 100 && /[A-Za-z]/.test(p) && /\d/.test(p);
