import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App.tsx";

describe("App", () => {
  it("renders the placeholder shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Firehorse memory graph" })).toBeInTheDocument();
  });
});
