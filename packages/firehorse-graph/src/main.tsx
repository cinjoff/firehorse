import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.tsx";
import "./index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("No #root element in index.html — the app has nowhere to mount.");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
