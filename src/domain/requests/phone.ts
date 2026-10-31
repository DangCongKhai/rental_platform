export function isValidPhone(value: string): boolean {
  return /^(0\d{9}|\+84\d{9})$/.test(value.trim());
}
