from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
jwt = JWTManager()

# In-memory set of revoked JWT identifiers (jti). Logout adds the current
# token's jti here so it can no longer be used. Note: this is per-process and
# resets on restart; a multi-instance deployment would back this with Redis.
revoked_tokens = set()
