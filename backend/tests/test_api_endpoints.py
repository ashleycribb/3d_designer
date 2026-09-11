import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_and_demo():
    from app.database import init_db, AsyncSessionLocal
    from app.services.demo_service import seed_equipment_types, seed_demonstration_project
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed_equipment_types(db)
        await seed_demonstration_project(db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Health check
        res = await client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"

        # List equipment types
        eq_res = await client.get("/api/equipment-types")
        assert eq_res.status_code == 200
        eq_types = eq_res.json()
        assert len(eq_types) >= 17
        type_ids = [t["id"] for t in eq_types]
        assert "VAV" in type_ids
        assert "AHU" in type_ids
        assert "DIFFUSER" in type_ids
        assert "THERMOSTAT" in type_ids

        # Projects list
        proj_res = await client.get("/api/projects")
        assert proj_res.status_code == 200
        projects = proj_res.json()
        assert len(projects) > 0
        demo_proj = next((p for p in projects if "Campus Engineering Hall" in p["name"]), None)
        assert demo_proj is not None

        # Get full project details
        detail_res = await client.get(f"/api/projects/{demo_proj['id']}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert len(detail["walls"]) > 0
        assert len(detail["rooms"]) > 0

        # Project equipment
        equip_res = await client.get(f"/api/projects/{demo_proj['id']}/equipment")
        assert equip_res.status_code == 200
        equipment = equip_res.json()
        assert len(equipment) > 0
        tags = [e["tag"] for e in equipment]
        assert "AHU-1" in tags
        assert "VAV-101" in tags


@pytest.mark.asyncio
async def test_multi_discipline_mep_and_3d_import():
    from app.database import init_db, AsyncSessionLocal
    from app.services.demo_service import seed_equipment_types, seed_demonstration_project
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed_equipment_types(db)
        await seed_demonstration_project(db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Verify expanded MEP equipment types exist
        eq_res = await client.get("/api/equipment-types")
        assert eq_res.status_code == 200
        eq_types_list = eq_res.json()
        eq_types = {t["id"]: t for t in eq_types_list}

        # Verify disciplines
        assert "TRANSFORMER" in eq_types
        assert eq_types["TRANSFORMER"]["discipline"] == "electrical"
        assert "CHW_PUMP" in eq_types
        assert eq_types["CHW_PUMP"]["discipline"] == "plumbing"
        assert "SPRINKLER_PENDANT" in eq_types
        assert eq_types["SPRINKLER_PENDANT"]["discipline"] == "fire_protection"

        # Get project id
        proj_res = await client.get("/api/projects")
        projects = proj_res.json()
        project_id = projects[0]["id"]

        # Test 3D Model Upload (.glb)
        fake_glb_content = b"glTF" + b"\x02\x00\x00\x00" + b"\x00\x00\x00\x00"
        files = {"file": ("trane_rooftop_custom.glb", fake_glb_content, "model/gltf-binary")}
        data = {
            "name": "Trane IntelliPak Custom RTU",
            "discipline": "mechanical",
            "category": "air_handler",
            "default_width": "8.5",
            "default_length": "16.0",
            "default_height": "6.0",
            "default_elevation": "12.0",
            "elevation_target": "roof",
            "color_hex": "#0284c7"
        }

        import_res = await client.post(
            f"/api/projects/{project_id}/equipment-types/import-3d",
            data=data,
            files=files
        )
        assert import_res.status_code == 200
        new_type = import_res.json()
        assert new_type["name"] == "Trane IntelliPak Custom RTU"
        assert new_type["discipline"] == "mechanical"
        assert new_type["model_url"] is not None
        assert "trane_rooftop_custom.glb" in new_type["model_url"]

        # Test serving the uploaded 3D model file
        model_filename = new_type["model_url"].split("/")[-1]
        model_file_res = await client.get(f"/api/projects/{project_id}/models/{model_filename}")
        assert model_file_res.status_code == 200
        assert model_file_res.content == fake_glb_content
        assert model_file_res.headers.get("content-type") == "model/gltf-binary"

