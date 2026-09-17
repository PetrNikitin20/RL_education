"""Минимальная Gymnasium-совместимая среда «собака–кость»."""
import numpy as np
import gymnasium as gym
from gymnasium import spaces


class DogBoneEnv(gym.Env):
    metadata = {"render_modes": ["ansi"]}
    moves = np.array([[-1, 0], [1, 0], [0, -1], [0, 1]])

    def __init__(self, size=11, step_penalty=-0.02, max_steps=None):
        self.size, self.step_penalty = size, step_penalty
        self.max_steps = max_steps or size * 3
        self.action_space = spaces.Discrete(4)
        self.observation_space = spaces.Box(-1, 1, shape=(2,), dtype=np.float32)
        self.bone = np.array([size - 1, size - 1])

    def _obs(self):
        return ((self.bone - self.dog) / (self.size - 1)).astype(np.float32)

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self.dog, self.steps = np.zeros(2, dtype=int), 0
        return self._obs(), {"distance": int(abs(self.bone - self.dog).sum())}

    def step(self, action):
        self.dog = np.clip(self.dog + self.moves[action], 0, self.size - 1)
        self.steps += 1
        terminated = bool(np.array_equal(self.dog, self.bone))
        truncated = self.steps >= self.max_steps
        reward = 1.0 if terminated else self.step_penalty
        return self._obs(), reward, terminated, truncated, {"position": self.dog.copy()}
