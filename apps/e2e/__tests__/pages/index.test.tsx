import { render, screen } from "@testing-library/react";
import Home from "../../pages/index";

describe("Home", () => {
  it("renders package name in heading", () => {
    render(<Home />);

    const heading = screen.getByRole("heading", {
      name: /@next-safe\/middleware/i,
    });
    expect(heading).toBeInTheDocument();
  });
  it("hydrates", async () => {
    render(<Home />);

    const hydrated = await screen.findByText(/the page has hydrated/);
    expect(hydrated).toBeInTheDocument();
  });
});
