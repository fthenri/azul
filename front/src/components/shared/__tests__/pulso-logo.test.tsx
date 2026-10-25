import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PulsoLogo } from "../pulso-logo";

describe("PulsoLogo Component", () => {
  it("renderiza imagens da logo no modo automático (dark e light)", () => {
    render(<PulsoLogo width={80} height={50} />);
    const images = screen.getAllByAltText("Logo Pulso");
    expect(images.length).toBe(2);
    // Deve conter pulso-branco.svg e pulso-preto.svg
    const sources = images.map((img) => img.getAttribute("src"));
    expect(sources.some((src) => src?.includes("pulso-branco.svg"))).toBe(true);
    expect(sources.some((src) => src?.includes("pulso-preto.svg"))).toBe(true);
  });

  it("renderiza versão branca ao especificar variant='dark'", () => {
    render(<PulsoLogo variant="dark" />);
    const image = screen.getByAltText("Logo Pulso");
    expect(image.getAttribute("src")).toContain("pulso-preto.svg");
  });

  it("renderiza versão preta ao especificar variant='light'", () => {
    render(<PulsoLogo variant="light" />);
    const image = screen.getByAltText("Logo Pulso");
    expect(image.getAttribute("src")).toContain("pulso-branco.svg");
  });
});
