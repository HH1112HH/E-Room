"""ARPAbet -> IPA (subset MVP, đủ cho test think/sink/rice/lice/very)."""
from __future__ import annotations

_MAP = {
    "TH": "θ", "DH": "ð", "SH": "ʃ", "ZH": "ʒ", "CH": "tʃ", "JH": "dʒ",
    "NG": "ŋ", "HH": "h", "R": "r", "ER": "ɜr", "AH": "ʌ", "IH": "ɪ",
    "IY": "i", "EH": "ɛ", "AE": "æ", "AA": "ɑ", "AO": "ɔ", "OW": "oʊ",
    "UW": "u", "UH": "ʊ", "AY": "aɪ", "EY": "eɪ", "OY": "ɔɪ", "AW": "aʊ",
    "S": "s", "Z": "z", "T": "t", "D": "d", "N": "n", "M": "m",
    "P": "p", "B": "b", "K": "k", "G": "g", "F": "f", "V": "v",
    "W": "w", "L": "l", "Y": "j",
}


def arpa_to_ipa(phone: str) -> str:
    base = phone.rstrip("012")
    return _MAP.get(base, base.lower())
