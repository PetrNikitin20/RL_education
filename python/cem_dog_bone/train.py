"""Одна учебная итерация Cross-Entropy Method."""
from dataclasses import dataclass
import numpy as np


@dataclass
class Session:
    states: np.ndarray
    actions: np.ndarray
    reward: float


def generate_session(env, policy, horizon=80, rng=None):
    rng = rng or np.random.default_rng()
    state, _ = env.reset()
    states, actions, total = [], [], 0.0
    for _ in range(horizon):
        probs = policy.predict_proba([state])[0]
        action = int(rng.choice(len(probs), p=probs))
        states.append(state); actions.append(action)
        state, reward, terminated, truncated, _ = env.step(action)
        total += reward
        if terminated or truncated:
            break
    return Session(np.asarray(states), np.asarray(actions), total)


def cem_iteration(env, policy, batch_size=100, percentile=75):
    sessions = [generate_session(env, policy) for _ in range(batch_size)]
    threshold = np.percentile([s.reward for s in sessions], percentile)
    elite = [s for s in sessions if s.reward >= threshold]
    policy.fit(np.concatenate([s.states for s in elite]),
               np.concatenate([s.actions for s in elite]))
    return {"mean_reward": np.mean([s.reward for s in sessions]),
            "threshold": threshold, "elite_count": len(elite)}
