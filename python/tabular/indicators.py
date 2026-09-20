"""Causal financial indicators for the tabular MOEX laboratory."""
from __future__ import annotations

import numpy as np
import pandas as pd


def add_indicators(frame: pd.DataFrame) -> pd.DataFrame:
    data = frame.copy().sort_values("date").reset_index(drop=True)
    close, volume = data["close"], data["volume"]
    returns = close.pct_change()
    data["mom5"] = close.pct_change(5)
    data["trend"] = (close - close.rolling(20).mean()) / close.rolling(20).std()
    data["vol20"] = returns.rolling(20).std()
    delta = close.diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = (-delta.clip(upper=0)).rolling(14).mean()
    data["rsi14"] = 100 - 100 / (1 + gain / loss.replace(0, np.nan))
    ema12, ema26 = close.ewm(span=12, adjust=False).mean(), close.ewm(span=26, adjust=False).mean()
    data["macd"] = (ema12 - ema26) / close
    previous = close.shift(1)
    true_range = pd.concat([(data.high-data.low), (data.high-previous).abs(), (data.low-previous).abs()], axis=1).max(axis=1)
    data["atr14"] = true_range.rolling(14).mean() / close
    data["bollinger_width"] = 4 * close.rolling(20).std() / close.rolling(20).mean()
    data["volume_z"] = (volume-volume.rolling(20).mean()) / volume.rolling(20).std()
    data["drawdown20"] = 1-close/close.rolling(20).max()
    return data.dropna().reset_index(drop=True)
