// Mock ssl-checker so tests don't make real network calls
jest.mock("../src/services/cert.service", () => require("./__mocks__/cert.service"));

import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/db";

const app = createApp();

async function registerAndGetToken(email: string): Promise<string> {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email, password: "Password123" });
  return res.body.data.token;
}

beforeEach(async () => {
  await prisma.monitor.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Monitor routes (protected)", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const res = await request(app).get("/api/monitors");
    expect(res.status).toBe(401);
  });

  it("creates, lists, fetches, re-checks, and deletes a monitor", async () => {
    const token = await registerAndGetToken("user@example.com");

    const created = await request(app)
      .post("/api/monitors")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "example.com" });

    expect(created.status).toBe(201);
    expect(created.body.data.domain).toBe("example.com");
    expect(created.body.data.status).toBe("ACTIVE");

    const id = created.body.data.id;

    const list = await request(app)
      .get("/api/monitors")
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });

    const single = await request(app)
      .get(`/api/monitors/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(single.status).toBe(200);
    expect(single.body.data.id).toBe(id);

    const recheck = await request(app)
      .post(`/api/monitors/${id}/check`)
      .set("Authorization", `Bearer ${token}`);
    expect(recheck.status).toBe(200);

    const removed = await request(app)
      .delete(`/api/monitors/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(removed.status).toBe(200);

    const afterDelete = await request(app)
      .get(`/api/monitors/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(afterDelete.status).toBe(404);
  });

  it("scopes monitors per-user (user A cannot see user B's monitors)", async () => {
    const tokenA = await registerAndGetToken("a@example.com");
    const tokenB = await registerAndGetToken("b@example.com");

    const created = await request(app)
      .post("/api/monitors")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ domain: "alice-domain.com" });

    const id = created.body.data.id;

    const bSeesA = await request(app)
      .get(`/api/monitors/${id}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(bSeesA.status).toBe(404);

    const bList = await request(app)
      .get("/api/monitors")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(bList.body.data).toHaveLength(0);
  });

  it("rejects invalid domain format with 400", async () => {
    const token = await registerAndGetToken("invalid@example.com");
    const res = await request(app)
      .post("/api/monitors")
      .set("Authorization", `Bearer ${token}`)
      .send({ domain: "not-a-domain" });
    expect(res.status).toBe(400);
  });
});

describe("GET /health", () => {
  it("returns 200 when DB reachable", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.db).toBe("ok");
  });
});
