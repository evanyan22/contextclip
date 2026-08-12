from contextclip.budget import estimate_tokens


def test_estimate_tokens_is_roughly_4_chars_per_token():
    assert estimate_tokens("a" * 40) == 10
