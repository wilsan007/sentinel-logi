import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

const Bomb = (): never => {
  throw new Error("Boom!");
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // Silence les console.error attendus de React lors du throw.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rend les enfants quand tout va bien", () => {
    render(
      <ErrorBoundary>
        <p>Contenu normal</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("Contenu normal")).toBeInTheDocument();
  });

  it("affiche le fallback en cas d'erreur", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Une erreur est survenue/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Recharger/i })).toBeInTheDocument();
  });
});
