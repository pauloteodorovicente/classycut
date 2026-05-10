"""Tests for the projects API endpoints."""


def test_create_project(client):
    res = client.post("/api/v1/projects", json={"name": "My Video"})
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "My Video"
    assert data["id"]
    assert data["media_count"] == 0


def test_list_projects_empty(client):
    res = client.get("/api/v1/projects")
    assert res.status_code == 200
    assert res.json() == []


def test_list_projects(client, sample_project):
    res = client.get("/api/v1/projects")
    assert res.status_code == 200
    projects = res.json()
    assert len(projects) == 1
    assert projects[0]["name"] == "Test Project"


def test_get_project(client, sample_project):
    project_id = sample_project["id"]
    res = client.get(f"/api/v1/projects/{project_id}")
    assert res.status_code == 200
    assert res.json()["name"] == "Test Project"


def test_get_project_not_found(client):
    res = client.get("/api/v1/projects/nonexistent")
    assert res.status_code == 404


def test_update_project(client, sample_project):
    project_id = sample_project["id"]
    res = client.patch(
        f"/api/v1/projects/{project_id}",
        json={"name": "Updated Name"},
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Updated Name"


def test_delete_project(client, sample_project):
    project_id = sample_project["id"]
    res = client.delete(f"/api/v1/projects/{project_id}")
    assert res.status_code == 204

    # Verify it's gone
    res = client.get(f"/api/v1/projects/{project_id}")
    assert res.status_code == 404


def test_delete_project_not_found(client):
    res = client.delete("/api/v1/projects/nonexistent")
    assert res.status_code == 404
