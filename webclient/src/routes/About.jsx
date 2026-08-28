import { AppWindow } from "@/layouts";
import { Button } from "@/components";

export function About() {
  return (
    <AppWindow>
      <div className="flex flex-col items-center">
        <img src="/box.png" className="w-52 rounded-xl mb-4" />
        <p className="mb-4">
          Brought to you by <u>Nakul Bansal</u>, <u>Micah Baker</u>,{" "}
          <u>Johnny Deng</u>, and <u>Simon Purdon</u>.
        </p>
        <Button as="a" href="/#" scale="lg" className="mb-1">
          Go Back
        </Button>
      </div>
    </AppWindow>
  );
}
