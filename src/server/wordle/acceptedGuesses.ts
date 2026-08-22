import "server-only";

import acceptedGuesses from "@/server/wordle/data/accepted-guesses.json";

const acceptedGuessSet = new Set<string>(acceptedGuesses);

export function isAcceptedWordleGuess(guess: string): boolean {
  return acceptedGuessSet.has(guess.toUpperCase());
}
