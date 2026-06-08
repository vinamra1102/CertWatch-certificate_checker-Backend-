export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "CertWatch API",
    version: "1.0.0",
    description: "SSL/TLS certificate monitoring API. Register, add domains, get expiry data.",
  },
  servers: [{ url: "/", description: "current host" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      ApiResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
          data: {},
        },
      },
      AuthCredentials: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
        },
      },
      Monitor: {
        type: "object",
        properties: {
          id: { type: "string" },
          domain: { type: "string" },
          status: { type: "string", enum: ["ACTIVE", "EXPIRED", "ERROR", "UNKNOWN"] },
          issuer: { type: "string", nullable: true },
          expiryDate: { type: "string", format: "date-time", nullable: true },
          daysRemaining: { type: "integer", nullable: true },
          lastCheckedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["system"],
        summary: "Health check (includes DB connectivity)",
        responses: { "200": { description: "Healthy" }, "503": { description: "Degraded" } },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/AuthCredentials" } },
          },
        },
        responses: {
          "201": { description: "User created, returns JWT" },
          "409": { description: "Email already in use" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["auth"],
        summary: "Login an existing user",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/AuthCredentials" } },
          },
        },
        responses: {
          "200": { description: "Login successful, returns JWT" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/monitors": {
      get: {
        tags: ["monitors"],
        summary: "List monitors (paginated)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: { "200": { description: "Monitor list with pagination meta" } },
      },
      post: {
        tags: ["monitors"],
        summary: "Add a new domain to monitor (runs immediate cert check)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["domain"],
                properties: { domain: { type: "string", example: "example.com" } },
              },
            },
          },
        },
        responses: { "201": { description: "Monitor created" } },
      },
    },
    "/api/monitors/{id}": {
      get: {
        tags: ["monitors"],
        summary: "Get a single monitor",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Monitor" }, "404": { description: "Not found" } },
      },
      delete: {
        tags: ["monitors"],
        summary: "Delete a monitor",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" }, "404": { description: "Not found" } },
      },
    },
    "/api/monitors/{id}/check": {
      post: {
        tags: ["monitors"],
        summary: "Trigger an on-demand cert re-check",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated monitor" } },
      },
    },
  },
};
