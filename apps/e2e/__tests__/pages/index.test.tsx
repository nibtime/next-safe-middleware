import { render, screen } from "@testing-library/react";
import Home from "../../pages/index";

describe("Home", () => {
  it("renders a heading", () => {
    render(<Home />);

    const heading = screen.getByRole("heading", {
      name: /@next-safe\/middleware e2e test app/i,
    });
    expect(heading).toBeInTheDocument();
  });
  it("hydrates", async () => {
    render(<Home />);

    const hydrated = await screen.findByText(/the page has hydrated/);
    expect(hydrated).toBeInTheDocument();
  });
});
