import { BareWindow } from "@/layouts";
import { Spinner } from "@/components";

/**
 * @param {object} props
 * @param {number} props.percentage
 */
export function Loading(props) {
  const { percentage } = props;

  return (
    <BareWindow>
      <div
        className="flex flex-col items-center gap-6"
        style={{ width: "20rem" }}
      >
        <Spinner />
        <p>Getting things ready... {percentage}%</p>
      </div>
    </BareWindow>
  );
}
