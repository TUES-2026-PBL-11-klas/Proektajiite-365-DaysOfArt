def serialize_user(user):
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "display_name": user.display_name,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "birth_date": user.birth_date.isoformat() if user.birth_date else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def serialize_organization(org):
    return {
        "id": str(org.id),
        "name": org.name,
        "min_age": org.min_age,
        "max_age": org.max_age,
        "description": org.description,
        "created_at": org.created_at.isoformat() if org.created_at else None,
    }
