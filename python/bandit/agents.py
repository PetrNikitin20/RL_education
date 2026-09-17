"""Учебные стратегии для стационарного Bernoulli bandit."""
from dataclasses import dataclass, field
import numpy as np


@dataclass
class EpsilonGreedy:
    n_arms: int
    epsilon: float = 0.1
    seed: int = 42
    q: np.ndarray = field(init=False)
    n: np.ndarray = field(init=False)

    def __post_init__(self):
        self.q = np.zeros(self.n_arms)
        self.n = np.zeros(self.n_arms, dtype=int)
        self.rng = np.random.default_rng(self.seed)

    def select_action(self) -> int:
        if self.rng.random() < self.epsilon:
            return int(self.rng.integers(self.n_arms))
        return int(np.argmax(self.q))

    def update(self, action: int, reward: float) -> None:
        self.n[action] += 1
        self.q[action] += (reward - self.q[action]) / self.n[action]


def run(probs=(0.18, 0.37, 0.62, 0.44), steps=1000, seed=42):
    rng, agent = np.random.default_rng(seed), EpsilonGreedy(len(probs), seed=seed)
    rewards, regret = [], []
    for _ in range(steps):
        action = agent.select_action()
        reward = float(rng.random() < probs[action])
        agent.update(action, reward)
        rewards.append(reward)
        regret.append(max(probs) - probs[action])
    return agent, np.asarray(rewards), np.cumsum(regret)
