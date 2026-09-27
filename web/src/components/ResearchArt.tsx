import { ThemeDrawing } from "./ThemeDrawing";
import { SelectedResearchArt } from "./SelectedResearchArt";
import { WordResearchArt } from "./WordResearchArt";
import type { Research } from "@/lib/content-schema";
export function ResearchArt({ theme, cover, large = false }: { theme: Research["theme"]; cover?: Research["cover"]; large?: boolean }) {
  if (cover?.type && cover.type !== "generated") return <SelectedResearchArt cover={cover} large={large} />;
  if (cover) return <WordResearchArt cover={cover} large={large} />;
  return <div className={`research-art art-${theme} ${large ? "art-large" : ""}`} aria-hidden="true">
    <span className="art-corner">FIELD NOTES / {theme === "forest" ? "01" : theme === "clay" ? "02" : "03"}</span>
    <ThemeDrawing theme={theme} />
    <span className="art-bottom">{theme === "forest" ? "THE FOUNDATIONS" : theme === "clay" ? "A CHANGE IN PERSPECTIVE" : "IDEAS IN CONTEXT"}</span><span className="art-plus">+</span>
  </div>;
}
