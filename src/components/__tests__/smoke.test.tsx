import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React, { type JSX } from "react";

function Hello(): JSX.Element {
  return <div>hello</div>;
}

describe("smoke", () => {
  it("renders a simple component", () => {
    render(<Hello />);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});
