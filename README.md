# Proektajiite-365-DaysOfArt

## Seed drawing themes

The backend includes 365 drawing themes in `backend/data/drawing_themes.json`.
Load them into the configured database with:

```bash
cd backend
python3 -m scripts.seed_topics
```

The command is repeatable: themes already present in `topics` are skipped by
title.
