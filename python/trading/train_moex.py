"""Reproducible laboratory-3 experiment on Russian equities.

This module deliberately separates train, validation and test. Students should add
their replay buffer and training loop around DuelingQNet, select hyperparameters on
validation, then call evaluate exactly once on test.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import numpy as np
import torch

from agent import DuelingQNet
from env import TradingEnv
from moex_data import FEATURES, chronological_split, load_snapshot


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def make_env(frame, fee: float, risk_lambda: float) -> TradingEnv:
    return TradingEnv(frame[FEATURES].to_numpy(), frame["next_return"].to_numpy(), fee, risk_lambda)


def evaluate(model, env: TradingEnv) -> list[dict]:
    observation, _ = env.reset(seed=0)
    protocol = []
    while True:
        with torch.no_grad():
            action = int(model(torch.tensor(observation, dtype=torch.float32).unsqueeze(0)).argmax(1))
        observation, reward, terminated, truncated, info = env.step(action)
        protocol.append({"action": action, "reward": float(reward), **info})
        if terminated or truncated:
            return protocol


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticker", default="SBER")
    parser.add_argument("--seed", type=int, default=20260920)
    parser.add_argument("--fee", type=float, default=0.001)
    parser.add_argument("--risk-lambda", type=float, default=0.5)
    args = parser.parse_args()
    seed_everything(args.seed)
    train, validation, test, scaler = chronological_split(load_snapshot(args.ticker))
    model = DuelingQNet(len(FEATURES) + 2, 3)
    # TODO(student): train with replay buffer on train; choose parameters on validation.
    # The final test protocol must not influence model or hyperparameter selection.
    result = {
        "ticker": args.ticker,
        "seed": args.seed,
        "rows": {"train": len(train), "validation": len(validation), "test": len(test)},
        "scaler": scaler,
        "warning": "Untrained reference network: implement the training loop before interpreting metrics.",
    }
    Path("artifacts").mkdir(exist_ok=True)
    Path(f"artifacts/{args.ticker}_experiment.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
