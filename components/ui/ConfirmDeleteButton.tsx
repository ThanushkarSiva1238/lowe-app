"use client";

import type { MouseEvent } from "react";
import { Button } from "./Button";

interface ConfirmDeleteButtonProps
  extends React.ComponentProps<typeof Button> {
  confirmMessage?: string;
}

export function ConfirmDeleteButton({
  confirmMessage = "Are you sure you want to delete this record?",
  onClick,
  ...props
}: ConfirmDeleteButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!window.confirm(confirmMessage)) {
      event.preventDefault();
      return;
    }
    if (onClick) {
      onClick(event);
    }
  };

  return <Button {...props} onClick={handleClick} />;
}

