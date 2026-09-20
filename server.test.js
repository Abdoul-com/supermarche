import test from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";

import { app } from "./server.js";

test("GET /api/health returns ok status", async () => {
  const response = await supertest(app).get("/api/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.service, "supermarche-manager-api");
});

test("GET /api/products returns product list", async () => {
  const response = await supertest(app).get("/api/products");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.items));
  assert.ok(response.body.items.length >= 1);
});

test("GET /api/categories returns category list", async () => {
  const response = await supertest(app).get("/api/categories");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.items));
  assert.ok(response.body.items.length >= 1);
});

test("GET /api/dashboard returns summary metrics", async () => {
  const response = await supertest(app).get("/api/dashboard");

  assert.equal(response.status, 200);
  assert.ok(typeof response.body.totalProducts === "number");
  assert.ok(typeof response.body.totalStock === "number");
  assert.ok(Array.isArray(response.body.items));
});
