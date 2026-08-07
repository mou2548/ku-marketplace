import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * The elevation vocabulary, as a component. Radius varies by role — a Card is
 * 20px, a Panel is 24px, a slot is 10px — because one radius everywhere reads
 * as a template (design principle 9, tokens §8).
 */
const surface = cva("relative", {
  variants: {
    elevation: {
      flat: "shadow-flat",
      raised: "shadow-raised",
      floating: "shadow-floating",
      sunken: "shadow-sunken",
      none: "",
    },
    shape: {
      card: "rounded-card",
      panel: "rounded-panel",
      control: "rounded-control",
      slot: "rounded-slot",
      pill: "rounded-pill",
    },
    fill: {
      surface: "bg-surface",
      sunken: "bg-surface-sunken",
      page: "bg-page",
      /** Lit metal plate — the game panel. */
      plate: "plate",
      none: "",
    },
    interactive: {
      true: "transition-[transform,box-shadow] duration-[--dur-base] ease-[--ease-out] hover:-translate-y-0.5 hover:shadow-floating",
      false: "",
    },
  },
  defaultVariants: {
    elevation: "raised",
    shape: "card",
    fill: "surface",
    interactive: false,
  },
});

export interface SurfaceProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof surface> {
  as?: "div" | "article" | "section" | "li" | "aside";
  /** Adds the 2% noise overlay. Requires a positioned parent, which Surface is. */
  noise?: boolean;
}

export function Surface({
  as: Tag = "div",
  className,
  elevation,
  shape,
  fill,
  interactive,
  noise = false,
  children,
  ...props
}: SurfaceProps) {
  return (
    <Tag
      {...props}
      className={cn(
        surface({ elevation, shape, fill, interactive }),
        noise && "texture-noise",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export { surface as surfaceStyles };
