import { DownChevron, UpChevron } from "@/public/icons/iconSets";

export default function AccordionToggleIcon({
  open,
  size = "md",
  className = "",
}: {
  open: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  void size;

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center ${className}`}
    >
      {open ? (
        <UpChevron className="h-5 w-5" />
      ) : (
        <DownChevron className="h-5 w-5" />
      )}
    </span>
  );
}
