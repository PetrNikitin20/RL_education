"""Q-learning, SARSA and Expected SARSA with an epsilon-greedy policy."""
from __future__ import annotations

from collections import defaultdict
import numpy as np


class TDAgent:
    def __init__(self, algorithm="q_learning", alpha=0.15, gamma=0.95, epsilon=0.20, seed=42):
        self.algorithm, self.alpha, self.gamma, self.epsilon = algorithm, alpha, gamma, epsilon
        self.q = defaultdict(lambda: np.zeros(2, dtype=float))
        self.rng = np.random.default_rng(seed)

    def act(self, state, explore=True):
        if explore and self.rng.random() < self.epsilon:
            return int(self.rng.integers(2))
        return int(np.argmax(self.q[state]))

    def update(self, state, action, reward, next_state, next_action):
        if self.algorithm == "q_learning":
            bootstrap = np.max(self.q[next_state])
        elif self.algorithm == "sarsa":
            bootstrap = self.q[next_state][next_action]
        else:
            greedy = int(np.argmax(self.q[next_state]))
            probabilities = np.full(2, self.epsilon / 2)
            probabilities[greedy] += 1 - self.epsilon
            bootstrap = float(probabilities @ self.q[next_state])
        td_error = reward + self.gamma * bootstrap - self.q[state][action]
        self.q[state][action] += self.alpha * td_error
        return float(td_error)
