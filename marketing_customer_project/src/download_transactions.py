"""Fetch the public full transactions RDS and fail if its audited hash changes."""
from __future__ import annotations

import hashlib
import urllib.request
from pathlib import Path


URL = "https://raw.githubusercontent.com/bradleyboehmke/completejourney/master/data/transactions.rds"
EXPECTED_SHA256 = "1fa0700033f1e5d9bb6b09e2be063d8d68474d346e95c50f2833e09d083e0007"
DEFAULT_DESTINATION = Path("marketing_customer_audit/raw/transactions_full.rds")


def main() -> None:
    destination = DEFAULT_DESTINATION
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".part")
    digest = hashlib.sha256()
    try:
        with urllib.request.urlopen(URL, timeout=60) as response, temporary.open("wb") as out:
            while chunk := response.read(1024 * 1024):
                digest.update(chunk)
                out.write(chunk)
        observed = digest.hexdigest()
        if observed != EXPECTED_SHA256:
            raise RuntimeError(f"SHA-256 mismatch: expected {EXPECTED_SHA256}, got {observed}")
        temporary.replace(destination)
        print(f"Downloaded and verified: {destination} ({observed})")
    finally:
        temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
