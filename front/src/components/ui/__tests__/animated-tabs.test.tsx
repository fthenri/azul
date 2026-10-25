import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnimatedTabs, type TabItem } from "../animated-tabs";

describe("AnimatedTabs Component", () => {
  type TestTabId = "all" | "pareto" | "personas";

  const mockTabs: TabItem<TestTabId>[] = [
    { id: "all", label: "Visão Geral", badge: "360°" },
    { id: "pareto", label: "Curva de Pareto", badge: 12 },
    { id: "personas", label: "Personas", disabled: true },
  ];

  it("renderiza todos os itens de abas e badges corretamente", () => {
    const handleChange = vi.fn();
    render(
      <AnimatedTabs
        tabs={mockTabs}
        activeTab="all"
        onChange={handleChange}
      />
    );

    expect(screen.getByText("Visão Geral")).toBeDefined();
    expect(screen.getByText("Curva de Pareto")).toBeDefined();
    expect(screen.getByText("Personas")).toBeDefined();
    expect(screen.getByText("360°")).toBeDefined();
    expect(screen.getByText("12")).toBeDefined();
  });

  it("dispara onChange ao clicar em uma aba ativa/inativa habilitada", () => {
    const handleChange = vi.fn();
    render(
      <AnimatedTabs
        tabs={mockTabs}
        activeTab="all"
        onChange={handleChange}
      />
    );

    const paretoButton = screen.getByRole("tab", { name: /Curva de Pareto/i });
    fireEvent.click(paretoButton);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith("pareto");
  });

  it("não dispara onChange para uma aba desabilitada", () => {
    const handleChange = vi.fn();
    render(
      <AnimatedTabs
        tabs={mockTabs}
        activeTab="all"
        onChange={handleChange}
      />
    );

    const personasButton = screen.getByRole("tab", { name: /Personas/i });
    fireEvent.click(personasButton);

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("marca aria-selected=true na aba ativa", () => {
    render(
      <AnimatedTabs
        tabs={mockTabs}
        activeTab="all"
        onChange={() => {}}
      />
    );

    const activeTab = screen.getByRole("tab", { name: /Visão Geral/i });
    const inactiveTab = screen.getByRole("tab", { name: /Curva de Pareto/i });

    expect(activeTab.getAttribute("aria-selected")).toBe("true");
    expect(inactiveTab.getAttribute("aria-selected")).toBe("false");
  });
});
