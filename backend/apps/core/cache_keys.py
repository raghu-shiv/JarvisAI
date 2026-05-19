def conversation_list_key(user_id: int) -> str:
    return f"jarvis:user:{user_id}:conversation_ids"


def prompt_list_key(user_id: int) -> str:
    return f"jarvis:user:{user_id}:prompt_ids"


def chat_rate_limit_key(user_id: int) -> str:
    return f"jarvis:user:{user_id}:chat_rate"
