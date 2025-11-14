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
const formatSchema = z.enum(["json", "csv"]).optional();

const apiGetSchema = z.object({
  url: urlSchema,
  headers: headersSchema,
  params: paramsSchema,
  format: formatSchema
});

const apiPostSchema = z.object({
  url: urlSchema,
  data: z.unknown().optional(),
  headers: headersSchema,
  params: paramsSchema,
  format: formatSchema
});

const apiPutSchema = z.object({
  url: urlSchema,
  data: z.unknown().optional(),
  headers: headersSchema,
  params: paramsSchema,
  format: formatSchema
});

const apiDeleteSchema = z.object({
  url: urlSchema,
  headers: headersSchema,
  params: paramsSchema,
  format: formatSchema
});

const apiRequestSchema = z.object({
  method: httpMethodSchema,
  url: urlSchema,
  data: z.unknown().optional(),
  headers: headersSchema,
  params: paramsSchema,
  format: formatSchema
});

// Helper function to validate arguments safely
function validateArgs(schema, args, toolName) {
  const argsToValidate = args || {};
  if (typeof argsToValidate !== 'object' || Array.isArray(argsToValidate)) {
    throw new Error(`Invalid arguments: expected object, got ${typeof argsToValidate}`);
  }
  return argsToValidate;
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

function escapeCsvValue(value) {
  if (value === undefined || value === null) return '';
  const stringValue = String(value);
  // Si contiene comas, saltos de línea o comillas, envolver en comillas y escapar comillas internas
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  // Si es un número, devolverlo tal cual
  if (!isNaN(stringValue) && stringValue.trim() !== '') {
    return stringValue;
  }
  return stringValue;
}

function convertArrayOfObjectsToCsv(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  // Obtener todas las claves únicas de todos los objetos
  const headers = new Set();
  data.forEach(obj => {
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => headers.add(key));
    }
  });

  const headerArray = Array.from(headers);
  if (headerArray.length === 0) {
    return '';
  }

  // Construir CSV
  const csvRows = [];
  csvRows.push(headerArray.map(escapeCsvValue).join(','));

  data.forEach(obj => {
    if (typeof obj === 'object' && obj !== null) {
      const row = headerArray.map(header => {
        const value = obj[header];
        return escapeCsvValue(value);
      });
      csvRows.push(row.join(','));
    }
  });

  return csvRows.join('\n');
}

function convertObjectToCsv(data) {
  if (typeof data !== 'object' || data === null) {
    return '';
  }

  const csvRows = [];
  const headers = Object.keys(data);

  if (headers.length === 0) {
    return '';
  }

  csvRows.push(headers.map(escapeCsvValue).join(','));
  csvRows.push(headers.map(header => escapeCsvValue(data[header])).join(','));

  return csvRows.join('\n');
}

function generateMetadataRow(result) {
  const metadata = [];
  metadata.push(`status:${result.status || 'N/A'}`);
  metadata.push(`method:${result.method || 'N/A'}`);
  metadata.push(`url:${result.url || 'N/A'}`);
  metadata.push(`time:${result.responseTime || 'N/A'}ms`);

  if (result.error) {
    metadata.push(`error:${result.error}`);
  }

  return `# ${metadata.join('|')}`;
}

function toCsv(result) {
  try {
    // Si hay error, devolver CSV de error simple
    if (result.error) {
      const errorCsv = [
        generateMetadataRow(result),
        'error,code,message',
        `${escapeCsvValue(result.error)},${escapeCsvValue(result.code || 'UNKNOWN_ERROR')},${escapeCsvValue(result.error)}`
      ].join('\n');
      return errorCsv;
    }

    // Generar metadatos como primera línea comentada
    const metadataRow = generateMetadataRow(result);

    // Procesar datos de respuesta
    let csvContent = '';

    if (result.data) {
      if (Array.isArray(result.data)) {
        // Si es array de objetos, convertir a CSV
        csvContent = convertArrayOfObjectsToCsv(result.data);
      } else if (typeof result.data === 'object') {
        // Si es objeto simple, convertir a CSV
        csvContent = convertObjectToCsv(result.data);
      } else {
        // Si es texto o número, crear CSV simple
        csvContent = `value\n${escapeCsvValue(result.data)}`;
      }
    }

    // Si no hay contenido CSV válido, crear estructura por defecto
    if (!csvContent) {
      csvContent = 'status,method,url\n' +
        `${escapeCsvValue(result.status)},${escapeCsvValue(result.method)},${escapeCsvValue(result.url)}`;
    }

    return `${metadataRow}\n${csvContent}`;

  } catch (error) {
    // Fallback en caso de error en la conversión
    const fallbackCsv = [
      generateMetadataRow(result),
      'error,code,message',
      `CSV Conversion Error,CONVERSION_ERROR,${escapeCsvValue(error.message)}`
    ].join('\n');
    return fallbackCsv;
  }
}

function buildContent(result, format) {
  if (format === 'csv') {
    return { content: [{ type: 'text', text: toCsv(result) }] };
  }
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
}

// Función genérica para manejar errores con logging
function handleErrorWithLogging(error, method, url, requestData = null, additionalContext = {}, format = 'json') {
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
  return buildContent(errorResponse, format);
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
            },
            format: {
              type: "string",
              enum: ["json", "csv"],
              description: "Output format (default: json)"
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
            },
            format: {
              type: "string",
              enum: ["json", "csv"],
              description: "Output format (default: json)"
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
            },
            format: {
              type: "string",
              enum: ["json", "csv"],
              description: "Output format (default: json)"
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
            },
            format: {
              type: "string",
              enum: ["json", "csv"],
              description: "Output format (default: json)"
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
            },
            format: {
              type: "string",
              enum: ["json", "csv"],
              description: "Output format (default: json)"
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
        const { url, headers, params, format } = validatedArgs;
        const fmt = format || 'json';

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

          const result = formatApiResponse(response, 'GET', url);
          return buildContent(result, fmt);
        } catch (error) {
          return handleErrorWithLogging(error, 'GET', url, null, { toolName: 'api_get' }, fmt);
        }
      }

      case "api_post": {
        // Validate arguments
        const validatedArgs = validateArgs(apiPostSchema, args, 'api_post');
        const { url, data, headers, params, format } = validatedArgs;
        const fmt = format || 'json';

        const startTime = Date.now();
        const config = {
          headers,
          params,
          metadata: { startTime }
        };

        try {
          const response = await apiClient.post(url, data, config);
          response.config.metadata.endTime = Date.now();

          const result = formatApiResponse(response, 'POST', url, data);
          return buildContent(result, fmt);
        } catch (error) {
          return handleErrorWithLogging(error, 'POST', url, data, { toolName: 'api_post' }, fmt);
        }
      }

      case "api_put": {
        // Validate arguments
        const validatedArgs = validateArgs(apiPutSchema, args, 'api_put');
        const { url, data, headers, params, format } = validatedArgs;
        const fmt = format || 'json';

        const startTime = Date.now();
        const config = {
          headers,
          params,
          metadata: { startTime }
        };

        try {
          const response = await apiClient.put(url, data, config);
          response.config.metadata.endTime = Date.now();

          const result = formatApiResponse(response, 'PUT', url, data);
          return buildContent(result, fmt);
        } catch (error) {
          return handleErrorWithLogging(error, 'PUT', url, data, { toolName: 'api_put' }, fmt);
        }
      }

      case "api_delete": {
        // Validate arguments
        const validatedArgs = validateArgs(apiDeleteSchema, args, 'api_delete');
        const { url, headers, params, format } = validatedArgs;
        const fmt = format || 'json';

        const startTime = Date.now();
        const config = {
          headers,
          params,
          metadata: { startTime }
        };

        try {
          const response = await apiClient.delete(url, config);
          response.config.metadata.endTime = Date.now();

          const result = formatApiResponse(response, 'DELETE', url);
          return buildContent(result, fmt);
        } catch (error) {
          return handleErrorWithLogging(error, 'DELETE', url, null, { toolName: 'api_delete' }, fmt);
        }
      }

      case "api_request": {
        // Validate arguments
        const validatedArgs = validateArgs(apiRequestSchema, args, 'api_request');
        const { method, url, data, headers, params, format } = validatedArgs;
        const fmt = format || 'json';

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

          const result = formatApiResponse(response, method.toUpperCase(), url, data);
          return buildContent(result, fmt);
        } catch (error) {
          return handleErrorWithLogging(error, method.toUpperCase(), url, data, { toolName: 'api_request' }, fmt);
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
