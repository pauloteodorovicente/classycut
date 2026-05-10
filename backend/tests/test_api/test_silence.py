"""Tests for the silence detection API endpoint."""


def test_silence_detect_requires_media(client, sample_project):
    res = client.post(
        f"/api/v1/projects/{sample_project['id']}/silence-detect",
        json={"media_id": "nonexistent"},
    )
    assert res.status_code == 404


def test_silence_detect_creates_job(client, sample_project, sample_video_file):
    # Upload media
    with open(sample_video_file, "rb") as f:
        upload_res = client.post(
            f"/api/v1/projects/{sample_project['id']}/media",
            files=[("files", ("test.mp4", f, "video/mp4"))],
        )
    media_id = upload_res.json()[0]["id"]

    res = client.post(
        f"/api/v1/projects/{sample_project['id']}/silence-detect",
        json={"media_id": media_id},
    )
    assert res.status_code == 202
    assert "job_id" in res.json()


def test_silence_cut_requires_media(client, sample_project):
    res = client.post(
        f"/api/v1/projects/{sample_project['id']}/silence-cut",
        json={
            "media_id": "nonexistent",
            "segments_to_keep": [{"start_ms": 0, "end_ms": 1000}],
        },
    )
    assert res.status_code == 404
