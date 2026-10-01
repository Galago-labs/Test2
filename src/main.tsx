// © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited.
// Third-party components: see public/third-party-notices.txt.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./fonts.css";
import "./index.css";
import "./room.css";
import "./menu.css";
import App from "./App.tsx";
import { GameErrorBoundary } from "./components/GameErrorBoundary.tsx";
import { FAVICON_ART, TEXTURE_ART } from "./assets/vectors.ts";

document.getElementById("game-favicon")?.setAttribute("href", FAVICON_ART.dataUrl);
document.documentElement.style.setProperty("--paper-grain", `url("${TEXTURE_ART.dataUrl}")`);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameErrorBoundary><App /></GameErrorBoundary>
  </StrictMode>
);
