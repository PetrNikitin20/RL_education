"""Dueling Double DQN: архитектура и TD-шаг обучения."""
import torch
from torch import nn
import torch.nn.functional as F


class DuelingQNet(nn.Module):
    def __init__(self, obs_dim, n_actions):
        super().__init__()
        self.body = nn.Sequential(nn.Linear(obs_dim, 128), nn.ReLU(), nn.Linear(128, 128), nn.ReLU())
        self.value = nn.Linear(128, 1)
        self.advantage = nn.Linear(128, n_actions)

    def forward(self, x):
        z = self.body(x); v, a = self.value(z), self.advantage(z)
        return v + a - a.mean(dim=1, keepdim=True)


def double_dqn_loss(batch, online, target, gamma=0.99):
    state, action, reward, next_state, done = batch
    with torch.no_grad():
        next_action = online(next_state).argmax(1, keepdim=True)
        next_q = target(next_state).gather(1, next_action)
        td_target = reward + gamma * (1 - done) * next_q
    q = online(state).gather(1, action)
    return F.smooth_l1_loss(q, td_target)
