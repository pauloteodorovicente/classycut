"""Tests for the media API endpoints."""

import io


def test_list_media_empty(client, sample_project):
    res = client.get(f"/api/v1/projects/{sample_project['id']}/media")
    assert res.status_code == 200
    assert res.json() == []


def test_upload_media(client, sample_project, sample_video_file):
    with open(sample_video_file, "rb") as f:
        res = client.post(
            f"/api/v1/projects/{sample_project['id']}/media",
            files=[("files", ("test.mp4", f, "video/mp4"))],
        )
    assert res.status_code == 201
    data = res.json()
    assert len(data) == 1
    assert data[0]["media_type"] == "video"
    assert data[0]["filename"] == "test.mp4"
    assert data[0]["width"] is not None
    assert data[0]["has_audio"] is True


def test_upload_media_project_not_found(client):
    res = client.post(
        "/api/v1/projects/nonexistent/media",
        files=[("files", ("test.mp4", io.BytesIO(b"fake"), "video/mp4"))],
    )
    assert res.status_code == 404


def test_delete_media(client, sample_project, sample_video_file):
    # Upload first
    with open(sample_video_file, "rb") as f:
        upload_res = client.post(
            f"/api/v1/projects/{sample_project['id']}/media",
            files=[("files", ("test.mp4", f, "video/mp4"))],
        )
    media_id = upload_res.json()[0]["id"]

    # Delete
    res = client.delete(f"/api/v1/media/{media_id}")
    assert res.status_code == 204

    # Verify gone
    res = client.get(f"/api/v1/media/{media_id}")
    assert res.status_code == 404


def test_stream_media(client, sample_project, sample_video_file):
    # Upload first
    with open(sample_video_file, "rb") as f:
        upload_res = client.post(
            f"/api/v1/projects/{sample_project['id']}/media",
            files=[("files", ("test.mp4", f, "video/mp4"))],
        )
    media_id = upload_res.json()[0]["id"]

    res = client.get(f"/api/v1/media/{media_id}/stream")
    assert res.status_code == 200
    assert "video" in res.headers.get("content-type", "")
