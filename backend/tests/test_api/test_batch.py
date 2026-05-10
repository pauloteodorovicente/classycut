"""Tests for the batch operations API endpoints."""


def test_batch_export_empty_list(client, sample_project):
    res = client.post(
        f"/api/v1/projects/{sample_project['id']}/batch-export",
        json={"media_ids": [], "preset": "original"},
    )
    assert res.status_code == 400


def test_batch_export_invalid_media(client, sample_project):
    res = client.post(
        f"/api/v1/projects/{sample_project['id']}/batch-export",
        json={"media_ids": ["nonexistent"], "preset": "original"},
    )
    assert res.status_code == 404


def test_batch_export_creates_jobs(client, sample_project, sample_video_file):
    with open(sample_video_file, "rb") as f:
        upload_res = client.post(
            f"/api/v1/projects/{sample_project['id']}/media",
            files=[("files", ("test.mp4", f, "video/mp4"))],
        )
    media_id = upload_res.json()[0]["id"]

    res = client.post(
        f"/api/v1/projects/{sample_project['id']}/batch-export",
        json={"media_ids": [media_id], "preset": "original"},
    )
    assert res.status_code == 202
    data = res.json()
    assert "job_id" in data
    assert data["total"] == 1
    assert len(data["child_job_ids"]) == 1


def test_upscale_requires_media(client, sample_project):
    res = client.post(
        f"/api/v1/projects/{sample_project['id']}/upscale",
        json={"media_id": "nonexistent", "scale_factor": 2},
    )
    assert res.status_code == 404


def test_upscale_invalid_scale(client, sample_project, sample_video_file):
    with open(sample_video_file, "rb") as f:
        upload_res = client.post(
            f"/api/v1/projects/{sample_project['id']}/media",
            files=[("files", ("test.mp4", f, "video/mp4"))],
        )
    media_id = upload_res.json()[0]["id"]

    res = client.post(
        f"/api/v1/projects/{sample_project['id']}/upscale",
        json={"media_id": media_id, "scale_factor": 3},
    )
    assert res.status_code == 400


def test_upscale_creates_job(client, sample_project, sample_video_file):
    with open(sample_video_file, "rb") as f:
        upload_res = client.post(
            f"/api/v1/projects/{sample_project['id']}/media",
            files=[("files", ("test.mp4", f, "video/mp4"))],
        )
    media_id = upload_res.json()[0]["id"]

    res = client.post(
        f"/api/v1/projects/{sample_project['id']}/upscale",
        json={"media_id": media_id, "scale_factor": 2, "method": "ffmpeg"},
    )
    assert res.status_code == 202
    assert "job_id" in res.json()
