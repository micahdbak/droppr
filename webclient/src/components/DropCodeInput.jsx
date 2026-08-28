/**
 * @param {object} props
 * @param {string} props.value
 * @param {(event: React.ChangeEvent<HTMLInputElement>) => void} props.onChange
 * @param {string} [props.placeholder]
 */
export function DropCodeInput(props) {
  const { value, onChange, placeholder = "A1B2C3" } = props;

  return (
    <input
      type="text"
      className="rounded-lg font-mono text-sm px-2 py-1 ring-inset ring-1
        ring-gray-400 focus:outline-none focus:ring-2"
      style={{ width: "calc(6ch + 1rem)" }}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      minLength={6}
      maxLength={6}
    />
  );
}
