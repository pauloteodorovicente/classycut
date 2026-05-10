"""Tests for the AI features API endpoints."""


def test_highlights_requires_media(client, sample_project):
    res = client.post(
        f"/api/v1/projects/{sample_project['id']}/highlights",
        json={"media_id": "nonexistent"},
    )
    assert res.status_code == 404


def test_highlights_creates_job(client, sample_project, sample_video_file):
    with open(sample_video_file, "rb") as f:
        upload_res = client.post(
            f"/api/v1/projects/{sample_project['id']}/media",
            files=[("files", ("test.mp4", f, "video/mp4"))],
        )
    media_id = upload_res.json()[0]["id"]

    res = client.post(
        f"/api/v1/projects/{sample_project['id']}/highlights",
        json={"media_id": media_id, "sensitivity": 0.5},
    )
    assert res.status_code == 202
    assert "job_id" in res.json()


def test_chapters_requires_transcription(client, sample_project, sample_video_file):
    with open(sample_video_file, "rb") as f:
        upload_res = client.post(
            f"/api/v1/projects/{sample_project['id']}/media",
            files=[("files", ("test.mp4", f, "video/mp4"))],
        )
    media_id = upload_res.json()[0]["id"]

    res = client.post(
        f"/api/v1/projects/{sample_project['id']}/chapters",
        json={"media_id": media_id},
    )
    assert res.status_code == 400
    assert "Transcription required" in res.json()["detail"]


def test_summary_requires_transcription(client, sample_project, sample_video_file):
    with open(sample_video_file, "rb") as f:
        upload_res = client.post(
            f"/api/v1/projects/{sample_project['id']}/media",
            files=[("files", ("test.mp4", f, "video/mp4"))],
        )
    media_id = upload_res.json()[0]["id"]

    res = client.post(
        f"/api/v1/projects/{sample_project['id']}/summary",
        json={"media_id": media_id},
    )
    assert res.status_code == 400
    assert "Transcription required" in res.json()["detail"]
