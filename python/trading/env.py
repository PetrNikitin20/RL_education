"""Long/cash trading environment for chronological MOEX experiments."""
import numpy as np
import gymnasium as gym
from gymnasium import spaces


class TradingEnv(gym.Env):
    def __init__(self, features, returns, fee=0.001, risk_lambda=0.5, initial_cash=100_000):
        self.x, self.returns, self.fee = np.asarray(features), np.asarray(returns), fee
        self.risk_lambda, self.initial_cash = risk_lambda, initial_cash
        self.action_space = spaces.Discrete(3)  # 0 sell/cash, 1 hold, 2 buy
        self.observation_space = spaces.Box(-np.inf, np.inf, shape=(self.x.shape[1] + 2,))

    def _obs(self):
        return np.r_[self.x[self.t], self.position, self.equity / 100_000 - 1]

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self.t, self.position, self.equity, self.peak = 0, 0, float(self.initial_cash), float(self.initial_cash)
        return self._obs(), {}

    def step(self, action):
        target = self.position if action == 1 else float(action == 2)
        turnover = abs(target - self.position)
        cost = self.fee * turnover
        pnl = target * self.returns[self.t]
        next_equity = self.equity * (1 + pnl - cost)
        self.peak = max(self.peak, next_equity)
        drawdown = 1 - next_equity / self.peak
        reward = np.log(max(next_equity, 1e-9) / self.equity) - self.risk_lambda * drawdown**2
        self.equity, self.position = next_equity, target
        self.t += 1
        terminated, truncated = False, self.t >= len(self.returns) - 1
        return self._obs(), reward, terminated, truncated, {
            "equity": self.equity,
            "position": self.position,
            "turnover": turnover,
            "cost": cost,
            "drawdown": drawdown,
        }
