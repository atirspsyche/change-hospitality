import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import styles from "./Button.module.css";

type ButtonElementProps =
  | ({ href: string } & Omit<ComponentPropsWithRef<"a">, "color">)
  | ({ href?: never } & Omit<ComponentPropsWithRef<"button">, "color">);

interface ButtonAppearance {
  children: ReactNode;
  icon?: LucideIcon | null;
  shadow?: boolean;
  hoverBackgroundColor?: CSSProperties["backgroundColor"];
  textColor?: CSSProperties["color"];
  hoverTextColor?: CSSProperties["color"];
  borderColor?: CSSProperties["borderColor"];
}

export type PrimaryButtonProps = ButtonElementProps & ButtonAppearance & {
  backgroundColor?: CSSProperties["backgroundColor"];
};

export type SecondaryButtonProps = ButtonElementProps & ButtonAppearance;

type ButtonProps = PrimaryButtonProps & { variant: "primary" | "secondary" };

function Button({
  variant,
  children,
  icon: Icon = ArrowUpRight,
  shadow = variant === "primary",
  backgroundColor = "var(--color-cream)",
  hoverBackgroundColor = "var(--color-blush)",
  textColor = "var(--color-ink)",
  hoverTextColor = "var(--color-ink)",
  borderColor = "var(--color-ink)",
  className,
  style,
  ...props
}: ButtonProps) {
  const buttonStyle: CSSProperties & Record<`--button-${string}`, string | number | undefined> = {
    "--button-background": variant === "secondary" ? "transparent" : backgroundColor,
    "--button-hover-background": hoverBackgroundColor,
    "--button-text": textColor,
    "--button-hover-text": hoverTextColor,
    "--button-border": borderColor,
    ...style,
  };
  const buttonClassName = [styles.button, className].filter(Boolean).join(" ");
  const content = (
    <>
      <span className={styles.label} data-button-label>{children}</span>
      {Icon && (
        <span className={styles.icon} aria-hidden="true">
          <Icon size={20} strokeWidth={2} focusable="false" />
        </span>
      )}
    </>
  );

  if (props.href !== undefined) {
    return (
      <a
        {...props}
        className={buttonClassName}
        style={buttonStyle}
        data-button-variant={variant}
        data-button-shadow={shadow}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={buttonClassName}
      style={buttonStyle}
      data-button-variant={variant}
      data-button-shadow={shadow}
    >
      {content}
    </button>
  );
}

export function PrimaryButton(props: PrimaryButtonProps) {
  return <Button {...props} variant="primary" />;
}

export function SecondaryButton(props: SecondaryButtonProps) {
  return <Button {...props} variant="secondary" />;
}
