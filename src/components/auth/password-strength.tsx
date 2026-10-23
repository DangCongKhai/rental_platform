const LEVELS = [
  { label: "Yếu", color: "bg-danger" },
  { label: "Trung bình", color: "bg-[#d08a00]" },
  { label: "Khá", color: "bg-success" },
  { label: "Mạnh", color: "bg-success" },
];

function score(password: string) {
  let s = 0;
  if (password.length >= 8) s++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++;
  if (/\d/.test(password)) s++;
  if (/[^A-Za-z0-9]/.test(password)) s++;
  return Math.max(1, s);
}

/** Four-bar meter shown under the sign-up password field. */
export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const value = score(password);
  const level = LEVELS[value - 1];
  const hint = /[^A-Za-z0-9]/.test(password)
    ? ""
    : " · nên thêm ký tự đặc biệt";

  return (
    <>
      <div className="mt-1 grid grid-cols-4 gap-1" aria-hidden="true">
        {LEVELS.map((_, i) => (
          <span
            key={i}
            className={`h-1.25 rounded-[3px] ${i < value ? level.color : "bg-[#dde3eb]"}`}
          />
        ))}
      </div>
      <div className="text-[13px] text-subtle" aria-live="polite">
        Độ mạnh: {level.label}
        {hint}
      </div>
    </>
  );
}
