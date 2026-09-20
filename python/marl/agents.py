"""Typed proposals for the market, risk and allocation agents."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Proposal:
    signal: float      # -1 .. +1
    confidence: float  #  0 .. 1
    rationale: str


class MarketAgent:
    def act(self, obs):
        signal = max(-1, min(1, obs["momentum"] / (obs["volatility"] + 1e-8)))
        return Proposal(signal, .75, "cross-sectional momentum adjusted for volatility")


class RiskAgent:
    def act(self, obs):
        signal = -max(obs["drawdown"], obs["var_95"])
        return Proposal(max(-1, signal), .9, "drawdown and VaR constraint")


class AllocationAgent:
    def act(self, obs):
        signal = max(-1, min(1, obs["diversification"] - obs["turnover"]))
        return Proposal(signal, .80, "diversification benefit minus turnover")
