"""MOEX ISS data loading, feature engineering and chronological splits."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd


FEATURES = ["return_1", "momentum_5", "momentum_20", "volatility_20", "volume_z20"]


def load_snapshot(ticker: str, path: str | Path = "data/moex_daily.json") -> pd.DataFrame:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    if ticker not in payload["securities"]:
        raise KeyError(f"Unknown ticker {ticker}; choose one of {sorted(payload['securities'])}")
    frame = pd.DataFrame(payload["securities"][ticker]["candles"])
    frame["date"] = pd.to_datetime(frame["date"])
    frame = frame.sort_values("date").set_index("date")
    frame["return_1"] = frame["close"].pct_change()
    frame["momentum_5"] = frame["close"].pct_change(5)
    frame["momentum_20"] = frame["close"].pct_change(20)
    frame["volatility_20"] = frame["return_1"].rolling(20).std()
    volume_mean = frame["volume"].rolling(20).mean()
    volume_std = frame["volume"].rolling(20).std().replace(0, np.nan)
    frame["volume_z20"] = (frame["volume"] - volume_mean) / volume_std
    frame["next_return"] = frame["close"].pct_change().shift(-1)
    return frame.dropna()


def chronological_split(frame: pd.DataFrame):
    """Return train 2022–2023, validation 2024 and final test 2025."""
    train = frame.loc["2022-01-01":"2023-12-31"].copy()
    validation = frame.loc["2024-01-01":"2024-12-31"].copy()
    test = frame.loc["2025-01-01":"2025-12-31"].copy()
    if min(map(len, (train, validation, test))) == 0:
        raise ValueError("Every chronological split must contain observations")
    mean_ = train[FEATURES].mean()
    std_ = train[FEATURES].std().replace(0, 1)
    for part in (train, validation, test):
        part.loc[:, FEATURES] = (part[FEATURES] - mean_) / std_
    return train, validation, test, {"mean": mean_.to_dict(), "std": std_.to_dict()}
