"""Агрегация не добавляет четвёртого агента: это часть среды исполнения."""
from .agents import MarketAgent, RiskAgent, NewsAgent


def decide(observation, news_weight=.30, position_limit=.45):
    agents = {"market": MarketAgent(), "risk": RiskAgent(), "news": NewsAgent()}
    weights = {"market": .50, "risk": .50 - news_weight, "news": news_weight}
    proposals = {name: agent.act(observation) for name, agent in agents.items()}
    score = sum(p.signal * p.confidence * weights[name] for name, p in proposals.items())
    stock = min(position_limit, max(.10, .35 + .35 * score))
    bonds = min(.70, max(.15, .50 - stock * .25))
    return {"stocks": stock, "bonds": bonds, "cash": 1 - stock - bonds}, proposals
