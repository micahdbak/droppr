/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export function BareWindow(props) {
  const { children } = props;

  return (
    <div
      className="fixed top-0 left-0 w-screen h-screen bg-white flex flex-col
        justify-center items-center p-6"
    >
      {children}
    </div>
  );
}
