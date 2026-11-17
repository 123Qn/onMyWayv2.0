import { twMerge } from "tailwind-merge";

/**
 * Join Tailwind class names, skipping false/empty ones; when two classes set the same thing the
 * later one wins, so a component's defaults can be overridden: cn("mt-1 text-ink", className)
 */
export const cn = (...classes: (string | false | null | undefined)[]) => twMerge(classes.filter(Boolean).join(" "));
