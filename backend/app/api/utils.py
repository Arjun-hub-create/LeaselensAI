def escape_like(value: str) -> str:
    """Make % and _ in a search term match themselves instead of acting as wildcards."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")