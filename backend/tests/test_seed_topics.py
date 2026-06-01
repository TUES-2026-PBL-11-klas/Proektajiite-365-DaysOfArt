from scripts.seed_topics import load_topics


def test_drawing_theme_seed_contains_a_unique_full_year():
    topics = load_topics()
    titles = [topic["title"] for topic in topics]

    assert len(topics) == 365
    assert len(set(titles)) == 365
    assert all(topic["description"] for topic in topics)
    assert all(topic["category"] for topic in topics)
