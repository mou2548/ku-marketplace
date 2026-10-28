import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge only knows Tailwind's default sizes, so it read the type
 * scale in globals.css (`text-body-sm`, `text-h3`, ...) as text *colours*.
 * `cn("text-body-sm", "text-ink-muted")` then kept only the colour and the
 * size silently fell back to the inherited one. Registering the scale as
 * font sizes lets a size and a colour live side by side again.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-lg",
            "display",
            "h1",
            "h2",
            "h3",
            "body-lg",
            "body",
            "body-sm",
            "caption",
            "meta",
            "overline",
            "numeric",
            "action",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
