interface AccountRequiredNoteProps {
  children: string;
  className?: string;
}

/** Short, quiet note for account-gated features. */
export function AccountRequiredNote({
  children,
  className = "",
}: AccountRequiredNoteProps) {
  return (
    <p
      className={`account-required-note${className ? ` ${className}` : ""}`}
    >
      {children}
    </p>
  );
}
