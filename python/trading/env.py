"""Каркас торговой среды. Доходность всегда оценивается вне обучающего периода."""
import numpy as np
import gymnasium as gym
from gymnasium import spaces


class TradingEnv(gym.Env):
    def __init__(self, features, returns, fee=0.001):
        self.x, self.returns, self.fee = np.asarray(features), np.asarray(returns), fee
        self.action_space = spaces.Discrete(3)  # 0 sell/cash, 1 hold, 2 buy
        self.observation_space = spaces.Box(-np.inf, np.inf, shape=(self.x.shape[1] + 2,))

    def _obs(self):
        return np.r_[self.x[self.t], self.position, self.equity / 100_000 - 1]

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed); self.t, self.position, self.equity = 0, 0, 100_000.0
        return self._obs(), {}

    def step(self, action):
        target = self.position if action == 1 else float(action == 2)
        cost = self.fee * abs(target - self.position)
        reward = self.position * self.returns[self.t] - cost
        self.equity *= 1 + reward; self.position = target; self.t += 1
        terminated, truncated = False, self.t >= len(self.returns) - 1
        return self._obs(), reward, terminated, truncated, {"equity": self.equity}
