"""The coordinator aggregates proposals and projects weights onto risk limits."""
from .agents import AllocationAgent, MarketAgent, RiskAgent


def decide(observation, allocation_weight=.30, position_limit=.35):
    agents = {"market": MarketAgent(), "risk": RiskAgent(), "allocation": AllocationAgent()}
    weights = {"market": .45, "risk": .55 - allocation_weight, "allocation": allocation_weight}
    proposals = {name: agent.act(observation) for name, agent in agents.items()}
    score = sum(p.signal * p.confidence * weights[name] for name, p in proposals.items())
    risky_share = min(.95, max(.10, .60 + .30 * score))
    raw = observation["candidate_weights"]
    capped = [min(position_limit, risky_share * value) for value in raw]
    total = sum(capped)
    if total > risky_share:
        capped = [value * risky_share / total for value in capped]
    return {"equities": capped, "cash": 1 - sum(capped)}, proposals
