from uuid import UUID


def to_uuid(value):
    if isinstance(value, UUID):
        return value
    return UUID(str(value))
