#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import axios from 'axios';

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
        const { url, headers = {}, params = {} } = args;

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
          return {
            content: [{
              type: "text",
              text: JSON.stringify(formatErrorResponse(error, 'GET', url), null, 2)
            }]
          };
        }
      }

      case "api_post": {
        const { url, data, headers = {}, params = {} } = args;

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
          return {
            content: [{
              type: "text",
              text: JSON.stringify(formatErrorResponse(error, 'POST', url, data), null, 2)
            }]
          };
        }
      }

      case "api_put": {
        const { url, data, headers = {}, params = {} } = args;

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
          return {
            content: [{
              type: "text",
              text: JSON.stringify(formatErrorResponse(error, 'PUT', url, data), null, 2)
            }]
          };
        }
      }

      case "api_delete": {
        const { url, headers = {}, params = {} } = args;

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
          return {
            content: [{
              type: "text",
              text: JSON.stringify(formatErrorResponse(error, 'DELETE', url), null, 2)
            }]
          };
        }
      }

      case "api_request": {
        const { method, url, data, headers = {}, params = {} } = args;

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
          return {
            content: [{
              type: "text",
              text: JSON.stringify(formatErrorResponse(error, method.toUpperCase(), url, data), null, 2)
            }]
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
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
  process.exit(1);
});