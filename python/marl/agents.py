"""Типизированные предложения специализированных агентов."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Proposal:
    signal: float      # -1 .. +1
    confidence: float  #  0 .. 1
    rationale: str


class MarketAgent:
    def act(self, obs):
        signal = max(-1, min(1, .6 * obs["momentum"] - .3 * obs["volatility"]))
        return Proposal(signal, .75, "momentum + volatility regime")


class RiskAgent:
    def act(self, obs):
        signal = -max(obs["drawdown"], obs["var_95"])
        return Proposal(max(-1, signal), .9, "drawdown and VaR constraint")


class NewsAgent:
    def act(self, obs):
        return Proposal(obs["sentiment"], obs["news_confidence"], "event sentiment")
