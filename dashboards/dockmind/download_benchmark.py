"""Descarga explícita del benchmark público. No se consulta desde el navegador."""
from pathlib import Path
from urllib.request import urlopen
import hashlib
URL='https://raw.githubusercontent.com/GonzaloBP/Almacen-de-datos-Walmart/main/Walmart.csv'
DEST=Path(__file__).parent/'research/Walmart.csv'
with urlopen(URL,timeout=60) as r:data=r.read()
DEST.write_bytes(data)
print(DEST,hashlib.sha256(data).hexdigest())
