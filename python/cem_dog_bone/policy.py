"""Политика CEM: классификатор действий по состоянию."""
from sklearn.neural_network import MLPClassifier


def build_policy(seed=42):
    return MLPClassifier(
        hidden_layer_sizes=(25, 25), activation="tanh",
        max_iter=300, warm_start=True, random_state=seed,
    )
