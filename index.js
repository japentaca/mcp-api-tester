#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from 'axios';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// Create an MCP server for API testing
const server = new Server({
  name: "api-tester",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

// Configure axios with reasonable defaults
const apiClient = axios.create({
  timeout: 30000, // 30 second timeout
  maxRedirects: 5,
});

// Validation schemas using Zod
const urlSchema = z.string().url("Invalid URL format");
const headersSchema = z.record(z.string()).optional().default({});
const paramsSchema = z.record(z.string()).optional().default({});
const httpMethodSchema = z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]);

const apiGetSchema = z.object({
  url: urlSchema,
  headers: headersSchema,
  params: paramsSchema
});

const apiPostSchema = z.object({
  url: urlSchema,
  data: z.any().optional(),
  headers: headersSchema,
  params: paramsSchema
});

const apiPutSchema = z.object({
  url: urlSchema,
  data: z.any().optional(),
  headers: headersSchema,
  params: paramsSchema
});

const apiDeleteSchema = z.object({
  url: urlSchema,
  headers: headersSchema,
  params: paramsSchema
});

const apiRequestSchema = z.object({
  method: httpMethodSchema,
  url: urlSchema,
  data: z.any().optional(),
  headers: headersSchema,
  params: paramsSchema
});

// Helper function to validate arguments safely
function validateArgs(schema, args, toolName) {
  try {
    // Verificar que schema existe y tiene el método parse
    if (!schema || typeof schema.parse !== 'function') {
      throw new Error(`Invalid schema provided for ${toolName}`);
    }

    // Si args es undefined o null, usar un objeto vacío
    const argsToValidate = args || {};

    // Verificar que args es un objeto
    if (typeof argsToValidate !== 'object' || Array.isArray(argsToValidate)) {
      throw new Error(`Invalid arguments: expected object, got ${typeof argsToValidate}`);
    }

    return schema.parse(argsToValidate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new Error(`Validation failed for ${toolName}: ${errorMessages}`);
    }
    throw error;
  }
}

// Helper function to format successful API responses
function formatApiResponse(response, method, url, requestData = null) {
  const result = {
    success: true,
    method: method,
    url: url,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data: response.data,
    responseTime: response.config.metadata?.endTime - response.config.metadata?.startTime || 'N/A'
  };

  if (requestData) {
    result.requestData = requestData;
  }

  return result;
}

// Helper function to format error responses
function formatErrorResponse(error, method, url, requestData = null) {
  const result = {
    success: false,
    method: method,
    url: url,
    error: error.message,
    code: error.code || 'UNKNOWN_ERROR'
  };

  if (error.response) {
    result.status = error.response.status;
    result.statusText = error.response.statusText;
    result.headers = error.response.headers;
    result.data = error.response.data;
  }

  if (requestData) {
    result.requestData = requestData;
  }

  return result;
}

// Función genérica para manejar errores con logging
function handleErrorWithLogging(error, method, url, requestData = null, additionalContext = {}) {
  const timestamp = new Date().toISOString();
  const errorResponse = formatErrorResponse(error, method, url, requestData);

  // Crear objeto completo de log con toda la información
  const logEntry = {
    timestamp,
    method,
    url,
    requestData,
    error: {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      stack: error.stack
    },
    response: error.response ? {
      status: error.response.status,
      statusText: error.response.statusText,
      headers: error.response.headers,
      data: error.response.data
    } : null,
    additionalContext,
    errorResponse
  };

  // Escribir al archivo de log
  try {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, 'api-tester-errors.log');
    const logLine = JSON.stringify(logEntry, null, 2) + '\n' + '='.repeat(80) + '\n';

    fs.appendFileSync(logFile, logLine);
  } catch (logError) {
    // Si falla el logging, al menos registrarlo en consola
    console.error('Error escribiendo al log:', logError.message);
    console.error('Error original:', error.message);
  }

  // Retornar la respuesta formateada para el cliente MCP
  return {
    content: [{
      type: "text",
      text: JSON.stringify(errorResponse, null, 2)
    }]
  };
}

// Register tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "api_get",
        description: "Make a GET request to a specified URL with optional headers and query parameters",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The URL to send the GET request to"
            },
            headers: {
              type: "object",
              description: "Optional headers as key-value pairs",
              additionalProperties: { type: "string" }
            },
            params: {
              type: "object",
              description: "Optional query parameters as key-value pairs",
              additionalProperties: { type: "string" }
            }
          },
          required: ["url"]
        }
      },
      {
        name: "api_post",
        description: "Make a POST request to a specified URL with optional data, headers and query parameters",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The URL to send the POST request to"
            },
            data: {
              description: "The data to send in the request body (JSON, text, etc.)"
            },
            headers: {
              type: "object",
              description: "Optional headers as key-value pairs",
              additionalProperties: { type: "string" }
            },
            params: {
              type: "object",
              description: "Optional query parameters as key-value pairs",
              additionalProperties: { type: "string" }
            }
          },
          required: ["url"]
        }
      },
      {
        name: "api_put",
        description: "Make a PUT request to a specified URL with optional data, headers and query parameters",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The URL to send the PUT request to"
            },
            data: {
              description: "The data to send in the request body (JSON, text, etc.)"
            },
            headers: {
              type: "object",
              description: "Optional headers as key-value pairs",
              additionalProperties: { type: "string" }
            },
            params: {
              type: "object",
              description: "Optional query parameters as key-value pairs",
              additionalProperties: { type: "string" }
            }
          },
          required: ["url"]
        }
      },
      {
        name: "api_delete",
        description: "Make a DELETE request to a specified URL with optional headers and query parameters",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The URL to send the DELETE request to"
            },
            headers: {
              type: "object",
              description: "Optional headers as key-value pairs",
              additionalProperties: { type: "string" }
            },
            params: {
              type: "object",
              description: "Optional query parameters as key-value pairs",
              additionalProperties: { type: "string" }
            }
          },
          required: ["url"]
        }
      },
      {
        name: "api_request",
        description: "Make a generic HTTP request with specified method, URL, and optional data, headers and query parameters",
        inputSchema: {
          type: "object",
          properties: {
            method: {
              type: "string",
              enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
              description: "HTTP method to use"
            },
            url: {
              type: "string",
              description: "The URL to send the request to"
            },
            data: {
              description: "The data to send in the request body (for POST, PUT, PATCH)"
            },
            headers: {
              type: "object",
              description: "Optional headers as key-value pairs",
              additionalProperties: { type: "string" }
            },
            params: {
              type: "object",
              description: "Optional query parameters as key-value pairs",
              additionalProperties: { type: "string" }
            }
          },
          required: ["method", "url"]
        }
      }
    ]
  };
});

// Register tools call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "api_get": {
        // Validate arguments
        const validatedArgs = validateArgs(apiGetSchema, args, 'api_get');
        const { url, headers, params } = validatedArgs;

        // Add timing metadata
        const startTime = Date.now();
        const config = {
          headers,
          params,
          metadata: { startTime }
        };

        try {
          const response = await apiClient.get(url, config);
          response.config.metadata.endTime = Date.now();

          return {
            content: [{
              type: "text",
              text: JSON.stringify(formatApiResponse(response, 'GET', url), null, 2)
            }]
          };
        } catch (error) {
          return handleErrorWithLogging(error, 'GET', url, null, { toolName: 'api_get' });
        }
      }

      case "api_post": {
        // Validate arguments
        const validatedArgs = validateArgs(apiPostSchema, args, 'api_post');
        const { url, data, headers, params } = validatedArgs;

        const startTime = Date.now();
        const config = {
          headers,
          params,
          metadata: { startTime }
        };

        try {
          const response = await apiClient.post(url, data, config);
          response.config.metadata.endTime = Date.now();

          return {
            content: [{
              type: "text",
              text: JSON.stringify(formatApiResponse(response, 'POST', url, data), null, 2)
            }]
          };
        } catch (error) {
          return handleErrorWithLogging(error, 'POST', url, data, { toolName: 'api_post' });
        }
      }

      case "api_put": {
        // Validate arguments
        const validatedArgs = validateArgs(apiPutSchema, args, 'api_put');
        const { url, data, headers, params } = validatedArgs;

        const startTime = Date.now();
        const config = {
          headers,
          params,
          metadata: { startTime }
        };

        try {
          const response = await apiClient.put(url, data, config);
          response.config.metadata.endTime = Date.now();

          return {
            content: [{
              type: "text",
              text: JSON.stringify(formatApiResponse(response, 'PUT', url, data), null, 2)
            }]
          };
        } catch (error) {
          return handleErrorWithLogging(error, 'PUT', url, data, { toolName: 'api_put' });
        }
      }

      case "api_delete": {
        // Validate arguments
        const validatedArgs = validateArgs(apiDeleteSchema, args, 'api_delete');
        const { url, headers, params } = validatedArgs;

        const startTime = Date.now();
        const config = {
          headers,
          params,
          metadata: { startTime }
        };

        try {
          const response = await apiClient.delete(url, config);
          response.config.metadata.endTime = Date.now();

          return {
            content: [{
              type: "text",
              text: JSON.stringify(formatApiResponse(response, 'DELETE', url), null, 2)
            }]
          };
        } catch (error) {
          return handleErrorWithLogging(error, 'DELETE', url, null, { toolName: 'api_delete' });
        }
      }

      case "api_request": {
        // Validate arguments
        const validatedArgs = validateArgs(apiRequestSchema, args, 'api_request');
        const { method, url, data, headers, params } = validatedArgs;

        const startTime = Date.now();
        const config = {
          method: method.toLowerCase(),
          url,
          headers,
          params,
          metadata: { startTime }
        };

        if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
          config.data = data;
        }

        try {
          const response = await apiClient.request(config);
          response.config.metadata.endTime = Date.now();

          return {
            content: [{
              type: "text",
              text: JSON.stringify(formatApiResponse(response, method.toUpperCase(), url, data), null, 2)
            }]
          };
        } catch (error) {
          return handleErrorWithLogging(error, method.toUpperCase(), url, data, { toolName: 'api_request' });
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    // Log del error general del handler
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type: 'handler_error',
      tool: name,
      error: {
        message: error.message,
        stack: error.stack
      },
      request: request
    };

    try {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFile = path.join(logDir, 'api-tester-errors.log');
      const logLine = JSON.stringify(logEntry, null, 2) + '\n' + '='.repeat(80) + '\n';

      fs.appendFileSync(logFile, logLine);
    } catch (logError) {
      console.error('Error escribiendo al log:', logError.message);
      console.error('Error original:', error.message);
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: false,
          error: error.message,
          tool: name
        }, null, 2)
      }],
      isError: true
    };
  }
});

// Main function to start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("API Tester MCP server running on stdio");
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error("Shutting down API Tester MCP server...");
  process.exit(0);
});

main().catch((error) => {
  console.error("Failed to start server:", error);

  // Log del error de inicialización del servidor
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type: 'server_startup_error',
    error: {
      message: error.message,
      stack: error.stack
    }
  };

  try {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, 'api-tester-errors.log');
    const logLine = JSON.stringify(logEntry, null, 2) + '\n' + '='.repeat(80) + '\n';

    fs.appendFileSync(logFile, logLine);
  } catch (logError) {
    console.error('Error escribiendo al log:', logError.message);
  }

  process.exit(1);
});