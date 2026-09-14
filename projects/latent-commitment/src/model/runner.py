from dataclasses import dataclass

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

YES_FORMS = ("Yes", " Yes", "yes", " yes", "YES")
NO_FORMS = ("No", " No", "no", " no", "NO")


@dataclass
class Runner:
    model: AutoModelForCausalLM
    tokenizer: AutoTokenizer
    device: str
    yes_ids: tuple[int, ...]
    no_ids: tuple[int, ...]

    def chat_prefix(self, messages: list[dict]) -> str:
        return self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=False,
        )


def _token_ids(tokenizer, forms: tuple[str, ...]) -> tuple[int, ...]:
    ids = []
    for form in forms:
        encoded = tokenizer.encode(form, add_special_tokens=False)
        if len(encoded) == 1:
            ids.append(encoded[0])
    if not ids:
        raise ValueError(f"no single-token form among {forms}")
    return tuple(dict.fromkeys(ids))


def load(model_id: str, dtype: torch.dtype = torch.bfloat16, device: str = "cuda") -> Runner:
    if device == "cpu":
        dtype = torch.float32
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForCausalLM.from_pretrained(model_id, dtype=dtype)
    model.to(device)
    model.eval()
    return Runner(
        model=model,
        tokenizer=tokenizer,
        device=device,
        yes_ids=_token_ids(tokenizer, YES_FORMS),
        no_ids=_token_ids(tokenizer, NO_FORMS),
    )


@torch.inference_mode()
def yes_probability(runner: Runner, prompts: list[str], batch_size: int = 32) -> list[float]:
    runner.tokenizer.padding_side = "left"
    if runner.tokenizer.pad_token_id is None:
        runner.tokenizer.pad_token = runner.tokenizer.eos_token
    out = []
    for start in range(0, len(prompts), batch_size):
        chunk = prompts[start:start + batch_size]
        encoded = runner.tokenizer(chunk, return_tensors="pt", padding=True).to(runner.device)
        logits = runner.model(**encoded).logits[:, -1, :].float()
        yes = torch.logsumexp(logits[:, list(runner.yes_ids)], dim=-1)
        no = torch.logsumexp(logits[:, list(runner.no_ids)], dim=-1)
        out.extend(torch.sigmoid(yes - no).tolist())
    return out


@torch.inference_mode()
def generate(runner: Runner, prompts: list[str], max_new_tokens: int = 12,
             temperature: float = 0.0, batch_size: int = 16,
             seed: int | None = None) -> list[str]:
    runner.tokenizer.padding_side = "left"
    if runner.tokenizer.pad_token_id is None:
        runner.tokenizer.pad_token = runner.tokenizer.eos_token
    if seed is not None:
        torch.manual_seed(seed)
    out = []
    for start in range(0, len(prompts), batch_size):
        chunk = prompts[start:start + batch_size]
        encoded = runner.tokenizer(chunk, return_tensors="pt", padding=True).to(runner.device)
        generated = runner.model.generate(
            **encoded,
            max_new_tokens=max_new_tokens,
            do_sample=temperature > 0.0,
            temperature=temperature if temperature > 0.0 else None,
            top_p=0.95 if temperature > 0.0 else None,
            pad_token_id=runner.tokenizer.pad_token_id,
        )
        for row, source in zip(generated, encoded["input_ids"]):
            text = runner.tokenizer.decode(row[source.shape[0]:], skip_special_tokens=True)
            out.append(text.strip())
    return out


@torch.inference_mode()
def hidden_state(runner: Runner, prompts: list[str], layer: int,
                 batch_size: int = 16) -> torch.Tensor:
    runner.tokenizer.padding_side = "left"
    if runner.tokenizer.pad_token_id is None:
        runner.tokenizer.pad_token = runner.tokenizer.eos_token
    chunks = []
    for start in range(0, len(prompts), batch_size):
        chunk = prompts[start:start + batch_size]
        encoded = runner.tokenizer(chunk, return_tensors="pt", padding=True).to(runner.device)
        states = runner.model(**encoded, output_hidden_states=True).hidden_states
        chunks.append(states[layer][:, -1, :].float().cpu())
    return torch.cat(chunks, dim=0)
