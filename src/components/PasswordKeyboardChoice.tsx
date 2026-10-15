export default function PasswordKeyboardChoice({
  en,
  textKeyboard,
  onChange,
  disabled = false,
}: {
  en: boolean;
  textKeyboard: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="access-show">
      <input
        type="checkbox"
        checked={textKeyboard}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {en ? "Letter / symbol keyboard" : "字母 / 符号键盘"}
    </label>
  );
}
