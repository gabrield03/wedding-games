import type { WordleLetterStatus } from "@/domain/wordle/types";

import type { WordleKeyboardStatuses } from "./useWordleGame";

const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

type WordleKeyboardProps = {
  statuses: WordleKeyboardStatuses;
  disabled: boolean;
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
};

export function WordleKeyboard({
  statuses,
  disabled,
  onLetter,
  onBackspace,
  onEnter,
}: WordleKeyboardProps) {
  return (
    <div
      className="mx-auto mt-8 w-full max-w-xl space-y-2"
      role="group"
      aria-label="On-screen keyboard"
    >
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={row} className="flex justify-center gap-1 sm:gap-2">
          {rowIndex === KEYBOARD_ROWS.length - 1 && (
            <ActionKey label="Enter" disabled={disabled} onClick={onEnter} />
          )}

          {[...row].map((letter) => {
            const status = statuses[letter];

            return (
              <button
                key={letter}
                type="button"
                disabled={disabled}
                onClick={() => onLetter(letter)}
                aria-label={status ? `${letter}, ${status}` : letter}
                data-status={status ?? "unused"}
                className={`min-h-14 min-w-0 flex-1 touch-manipulation rounded px-1 py-2 text-sm font-bold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-12 sm:text-base ${getKeyStatusClass(status)}`}
              >
                {letter}
              </button>
            );
          })}

          {rowIndex === KEYBOARD_ROWS.length - 1 && (
            <ActionKey
              label="⌫"
              accessibleLabel="Backspace"
              disabled={disabled}
              onClick={onBackspace}
            />
          )}
        </div>
      ))}
    </div>
  );
}

type ActionKeyProps = {
  label: string;
  accessibleLabel?: string;
  disabled: boolean;
  onClick: () => void;
};

function ActionKey({
  label,
  accessibleLabel,
  disabled,
  onClick,
}: ActionKeyProps) {
  const labelSizeClass = accessibleLabel
    ? "text-base"
    : "text-[9px] sm:text-xs";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={accessibleLabel}
      className={`min-h-14 min-w-0 flex-[2] touch-manipulation rounded border border-neutral-400 bg-neutral-200 px-0.5 py-2 font-bold text-neutral-950 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-12 ${labelSizeClass}`}
    >
      {label}
    </button>
  );
}

function getKeyStatusClass(status: WordleLetterStatus | undefined): string {
  switch (status) {
    case "correct":
      return "bg-green-700 text-white";
    case "present":
      return "bg-amber-500 text-neutral-950";
    case "absent":
      return "bg-neutral-600 text-white";
    default:
      return "bg-neutral-300 text-neutral-950";
  }
}
