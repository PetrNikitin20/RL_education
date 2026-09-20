"""Reference experiment for Laboratory 2 on the frozen MOEX snapshot."""
from __future__ import annotations

import json
from pathlib import Path
import pandas as pd
from indicators import add_indicators
from agents import TDAgent


def bin3(value, low, high):
    return 0 if value < low else 2 if value > high else 1


def state(row, position):
    return (bin3(row.trend, -.35, .35), bin3(row.mom5, -.02, .02),
            bin3(row.vol20, .009, .02), bin3(row.rsi14, 40, 60),
            bin3(row.macd, -.006, .006), bin3(row.atr14, .015, .035), position)


def main(ticker="SBER", algorithm="expected_sarsa"):
    root = Path(__file__).resolve().parents[2]
    snapshot = json.loads((root / "data" / "moex_daily.json").read_text(encoding="utf-8"))
    data = add_indicators(pd.DataFrame(snapshot["securities"][ticker]["candles"]))
    train = data[data.date < "2024-01-01"].reset_index(drop=True)
    agent = TDAgent(algorithm=algorithm)
    for _ in range(70):
        position, s = 0, state(train.iloc[0], 0)
        a = agent.act(s)
        for i in range(len(train)-1):
            next_return = train.close.iloc[i+1] / train.close.iloc[i] - 1
            reward = a * next_return - .001 * abs(a-position) - .08 * max(0, -a*next_return)
            ns, na = state(train.iloc[i+1], a), agent.act(state(train.iloc[i+1], a))
            agent.update(s, a, reward, ns, na)
            position, s, a = a, ns, na
    print(f"{ticker}: learned {len(agent.q)} discrete states with {algorithm}")


if __name__ == "__main__":
    main()
