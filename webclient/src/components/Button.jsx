/**
 * @param {object} props
 * @param {"button"|"a"} [props.as]
 * @param {"sm"|"md"|"lg"} [props.scale]
 * @param {"primary"|"secondary"|"danger"} [props.variant]
 * @param {string} [props.href]
 * @param {string} [props.type]
 * @param {string} [props.className] - extra classes, appended last
 * @param {React.ReactNode} props.children
 */
export function Button(props) {
  const {
    as = "button",
    scale = "md",
    variant = "primary",
    href,
    type = "button",
    className = "",
    children,
    ...rest
  } = props;

  const scaleClasses = {
    sm: "text-sm px-2 py-1 rounded-lg",
    md: "px-4 py-2 rounded-lg",
    lg: "text-lg px-4 py-2 rounded-xl",
  }[scale];

  const variantClasses = {
    primary: "bg-gray-700 hover:bg-gray-500 text-white",
    secondary:
      "bg-gray-100 ring-1 ring-inset ring-gray-400 hover:ring-2 text-gray-700",
    danger: "bg-red-700 hover:bg-red-500 text-white",
  }[variant];

  const classes = [
    "inline-flex items-center justify-center",
    scaleClasses,
    variantClasses,
    className,
  ].join(" ");

  if (as === "a") {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
