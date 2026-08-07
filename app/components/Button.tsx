"use client";

import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  ReactNode,
} from "react";
import SpinnerLoading from "./SpinnerLoading";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "neutral"
  | "ghost"
  | "outline";

type LegacyColor = "red" | "blue" | "green" | "grey";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl" | "mobile-xl" | "custom";
type TextSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl";

type Props = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "color"
> & {
  children?: ReactNode;
  text?: string;
  href?: string;
  link?: string;
  variant?: ButtonVariant;
  color?: LegacyColor;
  size?: ButtonSize;
  textSize?: TextSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  centered?: boolean;
  target?: string;
  rel?: string;
  download?: boolean | string;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-sky-800 text-white hover:bg-sky-200 hover:text-stone-950 focus-visible:ring-sky-500",
  secondary:
    "bg-stone-800 text-white hover:bg-stone-200 hover:text-stone-950 focus-visible:ring-stone-500",
  success:
    "bg-green-600 text-white hover:bg-green-200 hover:text-stone-950 focus-visible:ring-green-500",
  danger:
    "bg-red-800 text-white hover:bg-red-200 hover:text-stone-950 focus-visible:ring-red-500",
  warning:
    "bg-amber-500 text-white hover:bg-amber-200 hover:text-stone-950 focus-visible:ring-amber-500",
  neutral:
    "bg-gray-600 text-white hover:bg-gray-200 hover:text-stone-950 focus-visible:ring-gray-500",
  ghost:
    "bg-transparent text-sky-900 hover:bg-sky-50 focus-visible:ring-sky-500",
  outline:
    "border border-sky-800 bg-white text-sky-900 hover:bg-sky-50 focus-visible:ring-sky-500",
};

const legacyColorVariant: Record<LegacyColor, ButtonVariant> = {
  red: "danger",
  blue: "primary",
  green: "success",
  grey: "neutral",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "px-2.5 py-1 text-xs",
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2 text-xs",
  xl: "px-[4vw] py-2.5 text-sm md:px-[2vw] md:text-[1.5vw]",
  "mobile-xl": "px-[4vw] py-2.5 text-sm",
  custom: "",
};

const textSizeClasses: Record<TextSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getSafeRel(target?: string, rel?: string) {
  if (rel) return rel;
  return target === "_blank" ? "noopener noreferrer" : undefined;
}

export default function Button({
  children,
  text,
  href,
  link,
  variant,
  color,
  size = "md",
  textSize,
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  centered,
  className,
  disabled,
  type = "button",
  style,
  target,
  rel,
  download,
  ...buttonProps
}: Props) {
  const destination = href ?? link;
  const hasDestination = Boolean(destination && destination !== "none");
  const resolvedVariant = variant ?? (color ? legacyColorVariant[color] : "primary");
  const content = children ?? text;
  const isDisabled = disabled || loading;
  const spinnerColor =
    resolvedVariant === "ghost" || resolvedVariant === "outline"
      ? "black"
      : "white";
  const widthStyle: CSSProperties = fullWidth
    ? {
        ...style,
        width: "100%",
      }
    : style || {};

  const buttonClassName = cx(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-200",
    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-60",
    fullWidth && "w-full",
    sizeClasses[size],
    textSize && textSizeClasses[textSize],
    variantClasses[resolvedVariant],
    className,
  );

  const inner = (
    <>
      {loading ? (
        <SpinnerLoading size="sm" color={spinnerColor} />
      ) : (
        leftIcon
      )}
      {!loading && <span>{content}</span>}
      {!loading && rightIcon}
    </>
  );

  const element =
    hasDestination && !isDisabled ? (
      <Link
        href={destination as string}
        target={target}
        rel={getSafeRel(target, rel)}
        download={download}
        className={buttonClassName}
        style={widthStyle}
      >
        {inner}
      </Link>
    ) : (
      <button
        {...buttonProps}
        type={type}
        disabled={isDisabled}
        className={buttonClassName}
        style={widthStyle}
      >
        {inner}
      </button>
    );

  if (centered ?? Boolean(text && size !== "mobile-xl")) {
    return <div className="flex items-center justify-center">{element}</div>;
  }

  return element;
}
