"""Tests for the export API endpoint."""


def test_export_requires_media(client, sample_project):
    res = client.post(
        f"/api/v1/projects/{sample_project['id']}/export",
        json={"media_id": "nonexistent", "preset": "original"},
    )
    assert res.status_code == 404


def test_export_creates_job(client, sample_project, sample_video_file):
    # Upload media
    with open(sample_video_file, "rb") as f:
        upload_res = client.post(
            f"/api/v1/projects/{sample_project['id']}/media",
            files=[("files", ("test.mp4", f, "video/mp4"))],
        )
    media_id = upload_res.json()[0]["id"]

    # Start export
    res = client.post(
        f"/api/v1/projects/{sample_project['id']}/export",
        json={"media_id": media_id, "preset": "original"},
    )
    assert res.status_code == 202
    data = res.json()
    assert "job_id" in data
    assert data["status"] == "queued"


def test_export_invalid_project(client):
    res = client.post(
        "/api/v1/projects/nonexistent/export",
        json={"media_id": "x", "preset": "original"},
    )
    assert res.status_code == 404
