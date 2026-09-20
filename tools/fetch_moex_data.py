"""Download reproducible daily OHLCV snapshots from the public MOEX ISS API.

The generated JSON is used by the browser demonstrations for laboratories 3 and 4.
No API key is required for the public historical candles endpoint.
"""

from __future__ import annotations

import json
import time
from datetime import date
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


TICKERS = {
    "SBER": {"name": "Сбербанк", "sector": "Финансы"},
    "GAZP": {"name": "Газпром", "sector": "Нефть и газ"},
    "LKOH": {"name": "ЛУКОЙЛ", "sector": "Нефть и газ"},
    "NVTK": {"name": "НОВАТЭК", "sector": "Нефть и газ"},
    "GMKN": {"name": "Норникель", "sector": "Металлы"},
    "MGNT": {"name": "Магнит", "sector": "Потребительский сектор"},
    "YDEX": {"name": "Яндекс", "sector": "Информационные технологии"},
}
FROM = "2022-01-01"
TILL = "2025-12-31"
BASE = "https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/{ticker}/candles.json"


def fetch_ticker(ticker: str) -> list[dict]:
    rows: list[dict] = []
    start = 0
    while True:
        query = urlencode(
            {
                "from": FROM,
                "till": TILL,
                "interval": 24,
                "start": start,
                "iss.only": "candles",
                "candles.columns": "begin,open,high,low,close,volume,value",
            }
        )
        request = Request(
            f"{BASE.format(ticker=ticker)}?{query}",
            headers={"User-Agent": "RL-Education/1.0 educational snapshot"},
        )
        with urlopen(request, timeout=30) as response:
            payload = json.load(response)
        columns = payload["candles"]["columns"]
        page = [dict(zip(columns, values)) for values in payload["candles"]["data"]]
        if not page:
            break
        for row in page:
            row["date"] = row.pop("begin")[:10]
        rows.extend(page)
        start += len(page)
        if len(page) < 500:
            break
        time.sleep(0.15)
    return rows


def main() -> None:
    series = {}
    for ticker, meta in TICKERS.items():
        candles = fetch_ticker(ticker)
        if len(candles) < 100:
            raise RuntimeError(f"MOEX returned only {len(candles)} rows for {ticker}")
        series[ticker] = {**meta, "candles": candles}
        print(f"{ticker}: {len(candles)} daily candles")
    output = {
        "source": "Moscow Exchange ISS public API",
        "source_url": "https://iss.moex.com/iss/reference/409",
        "board": "TQBR",
        "interval": "24 (daily candles)",
        "from": FROM,
        "till": TILL,
        "generated": date.today().isoformat(),
        "securities": series,
    }
    destination = Path(__file__).resolve().parents[1] / "data" / "moex_daily.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {destination} ({destination.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
