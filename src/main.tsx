import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./fonts.css";
import "./index.css";
import "./room.css";
import App from "./App";
import { GameErrorBoundary } from "./components/GameErrorBoundary";
import { FAVICON_ART, TEXTURE_ART } from "./assets/vectors";

document.getElementById("game-favicon")?.setAttribute("href", FAVICON_ART.dataUrl);
document.documentElement.style.setProperty("--paper-grain", `url("${TEXTURE_ART.dataUrl}")`);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameErrorBoundary><App /></GameErrorBoundary>
  </StrictMode>
);
