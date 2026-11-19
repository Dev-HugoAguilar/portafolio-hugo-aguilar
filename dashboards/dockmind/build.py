from pathlib import Path

ROOT = Path(__file__).parent
RUNTIME = ROOT / "runtime"
html = (RUNTIME / "index.html").read_text(encoding="utf-8")
html = html.replace(
    '<link rel="stylesheet" href="styles.css">',
    "<style>" + (RUNTIME / "styles.css").read_text(encoding="utf-8") + "</style>",
)
html = html.replace(
    '<script src="vendor/d3.min.js"></script>',
    "<script>" + (RUNTIME / "vendor/d3.min.js").read_text(encoding="utf-8") + "</script>",
)
html = html.replace(
    '<script src="app.js"></script>',
    '<script id="data" type="application/json">'
    + (RUNTIME / "data.json").read_text(encoding="utf-8")
    + "</script><script>"
    + (RUNTIME / "app.js").read_text(encoding="utf-8")
    + "</script>",
)
out = ROOT / "DockMind_prototipo.html"
out.write_text(html, encoding="utf-8")
print("Prototipo autocontenido:", len(html), "caracteres")
