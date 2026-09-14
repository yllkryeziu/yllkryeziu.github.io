from src.game.world import World

ANSWER_RULES = (
    "You are the answerer in a game of 20 Questions.\n"
    "Think of exactly one animal from this list:\n{catalogue}\n"
    "Rules:\n"
    "1. Choose one animal now and keep it fixed for the whole game.\n"
    "2. Never reveal the animal until you are asked for it at the end.\n"
    "3. Answer every question with exactly one word, Yes or No.\n"
    "4. Every answer must be truthful about the animal you chose.\n"
)

COMMIT_TURN = "Have you chosen your animal? Reply with exactly one word: Ready."
REVEAL_TURN = "The game is over. Which animal were you thinking of? Reply with only its name."

FACT_RULES = (
    "Answer each question about animals with exactly one word, Yes or No.\n"
    "Judge the typical member of the species."
)


def catalogue(world: World, order: list[int] | None = None) -> str:
    indices = order if order is not None else list(range(world.object_count))
    return ", ".join(world.display(i) for i in indices)


def commit_messages(world: World, order: list[int] | None = None) -> list[dict]:
    return [
        {"role": "system", "content": ANSWER_RULES.format(catalogue=catalogue(world, order))},
        {"role": "user", "content": COMMIT_TURN},
    ]


def game_messages(world: World, questions: list[str], answers: list[str],
                  final: str | None, order: list[int] | None = None) -> list[dict]:
    messages = commit_messages(world, order)
    messages.append({"role": "assistant", "content": "Ready."})
    for question, answer in zip(questions, answers):
        messages.append({"role": "user", "content": question})
        messages.append({"role": "assistant", "content": answer})
    if final is not None:
        messages.append({"role": "user", "content": final})
    return messages


def fact_messages(statement: str) -> list[dict]:
    return [
        {"role": "system", "content": FACT_RULES},
        {"role": "user", "content": statement},
    ]
