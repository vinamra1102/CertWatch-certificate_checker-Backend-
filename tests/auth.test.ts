import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/db";

const app = createApp();

beforeEach(async () => {
  await prisma.monitor.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/auth/register", () => {
  it("creates a new user and returns a jwt", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "alice@example.com", password: "Password123" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe("alice@example.com");
  });

  it("rejects duplicate email with 409", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "bob@example.com", password: "Password123" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "bob@example.com", password: "Password123" });

    expect(res.status).toBe(409);
  });

  it("rejects weak password with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "carol@example.com", password: "short" });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "dave@example.com", password: "Password123" });
  });

  it("returns a token for valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "dave@example.com", password: "Password123" });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it("rejects wrong password with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "dave@example.com", password: "WrongPassword1" });

    expect(res.status).toBe(401);
  });

  it("rejects unknown email with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "Password123" });

    expect(res.status).toBe(401);
  });
});
