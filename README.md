# RL education — подготовка к лабораторной работе

Учебный комплект по дисциплине «Прикладные задачи машинного обучения»: презентация по шаблону Финансового университета, подробный текст лектора, модульные Python-примеры и интерактивный сайт.

**Сайт:** https://petrnikitin20.github.io/RL_education/  
**Автор:** Никитин Пётр Владимирович, кафедра искусственного интеллекта Финансового университета.

## Что включено

1. Многорукий бандит: ε-greedy, UCB1, Thompson sampling, награда и cumulative regret.
2. Cross-Entropy Method: среда «собака–кость», элитные траектории, reward shaping.
3. Q-learning, DQN, Double DQN и Dueling Double DQN: учебная торговая среда, комиссии и риск-метрики.
4. Multi-agent RL: три роли — Market, Risk и News Agent — и координация портфеля.

Веб-демонстрации выполняются полностью в браузере и не требуют сервера. На странице одновременно открыт один пример; остальные выбираются по ссылкам в верхнем меню. Для каждого примера приведены постановка задачи, описание данных, анимация и динамический вывод после действия. В CEM собака проходит маршрут по клеткам и собирает кость. Числа в торговом стенде синтетические и предназначены только для обучения.

## Структура

```text
assets/                  интерфейс и интерактивные демонстрации
python/bandit/           стратегии многорукого бандита
python/cem_dog_bone/     среда, политика и обучение CEM
python/trading/          торговая среда и Dueling Double DQN
python/marl/             три агента и координатор
slides/                  презентация к лабораторной работе
materials/               подробный текст лектора к каждому слайду
```

## Локальный запуск сайта

```bash
python -m http.server 8000
```

Откройте `http://localhost:8000`.

## Запуск Python-примеров

```bash
python -m venv .venv
python -m pip install -r requirements.txt
```

Примеры — каркасы для лабораторной работы: студенту необходимо добавить журналирование, воспроизводимый эксперимент, временное разбиение данных, baseline, несколько random seed и доверительные интервалы.

## Корректная оценка торгового агента

- Делить данные только по времени: train → validation → test.
- Нормализатор и признаки обучать только на train.
- Учитывать комиссию, проскальзывание и ограничение ликвидности.
- Сравнивать с Buy & Hold и простой rule-based стратегией.
- Отчёт: cumulative return, annualized volatility, Sharpe/Sortino, maximum drawdown, turnover, число сделок.
- Не делать вывод о будущей доходности по одному историческому периоду.

## Основные источники

- Sutton, Barto. *Reinforcement Learning: An Introduction*, 2nd ed. — http://incompleteideas.net/book/the-book-2nd.html
- Gymnasium API — https://gymnasium.farama.org/main/api/env/
- Mnih et al. *Human-level control through deep reinforcement learning* — https://doi.org/10.1038/nature14236
- van Hasselt et al. *Deep Reinforcement Learning with Double Q-learning* — https://doi.org/10.1609/aaai.v30i1.10295
- Wang et al. *Dueling Network Architectures for Deep Reinforcement Learning* — https://proceedings.mlr.press/v48/wangf16.html
- FinRL — https://github.com/AI4Finance-Foundation/FinRL
- PettingZoo — https://pettingzoo.farama.org/
- QMIX — https://proceedings.mlr.press/v80/rashid18a.html
- MADDPG — https://proceedings.neurips.cc/paper/2017/hash/68a9750337a418a86fe06c1991a1d64c-Abstract.html
- MAPPO — https://arxiv.org/abs/2103.01955

## Лицензия и оговорка

Материалы предназначены для образовательного использования. Торговые примеры не являются инвестиционной рекомендацией и не подтверждают возможность получить аналогичную доходность на реальном рынке.
