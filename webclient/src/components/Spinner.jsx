import { useEffect, useState } from "react";

export function Spinner() {
  const [degree, setDegree] = useState(0);

  useEffect(() => {
    const degreeInterval = setInterval(() => {
      setDegree((_degree) => {
        if (_degree + 5 > 360) {
          return 0;
        }

        return _degree + 5;
      });
    }, 10); // 10ms

    return () => {
      clearInterval(degreeInterval);
    };
  }, []);

  return (
    <img
      style={{
        transform: `rotate(${degree}deg)`,
        opacity: "0.75",
      }}
      src="/spinner.svg"
      width="32"
      height="32"
    />
  );
}
