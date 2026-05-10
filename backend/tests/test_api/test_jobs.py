"""Tests for the jobs API endpoints."""

from app.models.job import Job


def test_list_jobs_empty(client):
    res = client.get("/api/v1/jobs")
    assert res.status_code == 200
    assert res.json() == []


def test_list_jobs_with_filter(client, db_session, sample_project):
    # Create test jobs
    job1 = Job(project_id=sample_project["id"], job_type="export", status="done")
    job2 = Job(project_id=sample_project["id"], job_type="export", status="queued")
    db_session.add_all([job1, job2])
    db_session.commit()

    # Filter by status
    res = client.get("/api/v1/jobs", params={"status": "done"})
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["status"] == "done"


def test_get_job(client, db_session, sample_project):
    job = Job(project_id=sample_project["id"], job_type="export", status="queued")
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)

    res = client.get(f"/api/v1/jobs/{job.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["job_type"] == "export"
    assert data["status"] == "queued"
    assert data["progress"] == 0.0


def test_get_job_not_found(client):
    res = client.get("/api/v1/jobs/nonexistent")
    assert res.status_code == 404
