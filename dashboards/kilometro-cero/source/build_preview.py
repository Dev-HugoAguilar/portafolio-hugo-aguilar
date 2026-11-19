"""Construye un HTML autocontenido para revisión visual sin servidor."""
from pathlib import Path

ROOT = Path(__file__).parent
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
CSS = (ROOT / "styles.css").read_text(encoding="utf-8")
JS = (ROOT / "app.js").read_text(encoding="utf-8")
D3 = (ROOT / "vendor" / "d3.min.js").read_text(encoding="utf-8")
MAPLIBRE_CSS = (ROOT / "vendor" / "maplibre-gl.css").read_text(encoding="utf-8")
MAPLIBRE_JS = (ROOT / "vendor" / "maplibre-gl.js").read_text(encoding="utf-8")
SCENARIO = (ROOT / "data" / "scenarios.json").read_text(encoding="utf-8")
ROADS = (ROOT / "data" / "roads.geojson").read_text(encoding="utf-8")
WORLD = (ROOT / "world.geojson").read_text(encoding="utf-8")

HTML = HTML.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{CSS}\n</style>")
HTML = HTML.replace('<script src="vendor/d3.min.js"></script>', f"<script>\n{D3}\n</script>")
HTML = HTML.replace(
    '<link rel="stylesheet" href="vendor/maplibre-gl.css">',
    f"<style>{MAPLIBRE_CSS}</style>",
)
HTML = HTML.replace(
    '<script src="vendor/maplibre-gl.js"></script>',
    f"<script>{MAPLIBRE_JS}</script>",
)
EMBEDDED = (
    '<script id="roads-data" type="application/json">' + ROADS + "</script>"
    f'<script id="scenario-data" type="application/json">{SCENARIO}</script>\n'
    f'<script id="world-data" type="application/json">{WORLD}</script>\n'
    f"<script>\n{JS}\n</script>"
)
HTML = HTML.replace('<script src="app.js"></script>', EMBEDDED)
OUT = ROOT / "prototipo_local.html"
OUT.write_text(HTML, encoding="utf-8")
print(f"HTML autocontenido generado: {OUT.stat().st_size:,} bytes")
