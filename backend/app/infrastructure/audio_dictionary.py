from __future__ import annotations

import json
from pathlib import Path

from app.log import get_logger

logger = get_logger(__name__)

WEIGHT_DIR = Path(__file__).parent.parent / "weight"
WEIGHT_DIR.mkdir(parents=True, exist_ok=True)


class CMUDictionary:
    dict: dict[str, list[str]] = {}

    def __init__(self) -> None:
        if CMUDictionary.dict:
            return
        local = WEIGHT_DIR / "cmudict.json"
        if local.exists():
            with open(local) as f:
                CMUDictionary.dict = json.load(f)
            logger.info("Đã tải CMUdict từ file local", extra={"entries": len(self.dict)})
            return
        logger.info("Bắt đầu tải CMUdict...")
        import urllib.request

        url = "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict"
        raw = urllib.request.urlopen(url, timeout=15).read().decode("latin-1")
        for line in raw.splitlines():
            parts = line.strip().split()
            if parts:
                word = parts[0].lower().rstrip("(0123456789)")
                phones = [p.rstrip("0123456789") for p in parts[1:]]
                if word and phones:
                    CMUDictionary.dict[word] = phones
        with open(local, "w") as f:
            json.dump(CMUDictionary.dict, f)
        logger.info("Tải CMUdict hoàn tất", extra={"entries": len(self.dict)})

    def lookup(self, word: str) -> list[str]:
        phones = self.dict.get(word)
        if phones is None:
            logger.debug("CMUdict: từ '%s' không tìm thấy", word)
        return phones or []
