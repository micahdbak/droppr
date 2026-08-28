import { BareWindow } from "@/layouts";
import { Button } from "@/components";

export function NotFound() {
  return (
    <BareWindow>
      <div className="flex flex-col items-center gap-4">
        <p className="text-2xl font-semibold">Not found.</p>
        <p className="text-sm text-gray-500">That page doesn&apos;t exist.</p>
        <Button as="a" href="/#" scale="lg">
          Go Home
        </Button>
      </div>
    </BareWindow>
  );
}
