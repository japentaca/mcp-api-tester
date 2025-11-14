# Multiple Output Formats for API Tester MCP

This document describes the full implementation plan to support multiple output formats (JSON and CSV) for all HTTP tools provided by the API Tester MCP server, and the parameters required so clients can discover and use these formats.

## Overview
- Add a `format` argument to all tools to select the output format.
- Supported formats: `json` (default) and `csv`.
- Keep existing JSON structure unchanged for backward compatibility.
- Ensure both success and error responses respect the selected format.
- Advertise `format` in each tool’s `inputSchema` so clients can discover available formats.

## Parameters
- `format`
  - Type: `string`
  - Allowed values: `"json"`, `"csv"`
  - Default: `"json"`
  - Presence: optional in all tools (`api_get`, `api_post`, `api_put`, `api_delete`, `api_request`).

## Response Behavior
- `json`: Return the current structured response object with fields such as `success`, `method`, `url`, `status`, `statusText`, `headers`, `data`, `responseTime`, and optionally `requestData`.
- `csv`: Return a single CSV document composed of:
  - Header: `success,method,url,status,statusText,responseTime,error,code,headers,data,requestData`
  - Row: Values extracted from the standardized response object.
  - Complex fields (`headers`, `data`, `requestData`) serialized to JSON strings; quotes escaped; newlines replaced.

## Server Design Changes
- Add `format` support to success paths of all tools.
- Add `format` support to error paths (via shared error handler) to produce symmetric CSV documents.
- Implement a `toCsv(result)` serializer:
  - Use fixed header ordering.
  - Escape `"` characters and remove line breaks inside fields.
  - JSON-stringify nested objects.
- Preserve existing logging and metadata handling (start/end times).

## Tool Input Schema Updates
Update the `ListToolsRequestSchema` handler to advertise `format` in each tool’s `inputSchema` so clients know available formats.

- Add under each tool’s `properties`:
  ```json
  "format": {
    "type": "string",
    "enum": ["json", "csv"],
    "description": "Output format (default: json)"
  }
  ```
- Tools affected:
  - `api_get`
  - `api_post`
  - `api_put`
  - `api_delete`
  - `api_request`

## Validation Strategy
There are two acceptable approaches; choose one and apply consistently.

- Explicit validation (recommended):
  - Define `formatSchema = z.enum(["json","csv"]).optional().default("json")`.
  - Add `format: formatSchema` to Zod schemas for all tools.
  - Benefits: early error surfacing, clearer contracts.

- Permissive acceptance:
  - Keep existing schemas and apply `.passthrough()` to allow unknown fields.
  - Read `format` from validated arguments.
  - Benefits: minimal schema changes; still document `format` via `inputSchema`.

## CSV Serialization Spec
- Header columns: `success,method,url,status,statusText,responseTime,error,code,headers,data,requestData`.
- Cell generation:
  - Primitive values: stringified as-is.
  - Objects/arrays: JSON-stringify.
  - Escape quotes by doubling them; replace newlines with spaces.
- Always emit both header and a single data row for consistency.

## Error Handling
- Shared error handler enriches logs and returns formatted output.
- When `format === "csv"`, produce the same header/row layout:
  - Populate `error` and `code` from the error.
  - Include `status`, `statusText`, `headers`, `data` only if available from `error.response`.
  - Leave missing fields empty.

## Backward Compatibility
- Default `format` to `json` to keep existing behavior for clients that do not specify `format`.
- JSON output remains identical to current structure.

## Testing Plan
- Integration tests (script-based):
  - For each tool, call with `format: "csv"` and assert:
    - Output begins with the defined header.
    - Output has exactly one data row.
    - CSV row contains expected method and URL.
  - Call with `format: "json"` and assert existing JSON structure is returned.

- Negative tests (if explicit validation is implemented):
  - Call with `format: "xml"` and assert validation error is surfaced.

- Manual checks:
  - Exercise `api_request` across methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) and validate CSV/JSON outputs.

## Examples
- `api_get` CSV:
  ```json
  {
    "name": "api_get",
    "arguments": {
      "url": "https://api.example.com/users",
      "headers": { "Authorization": "Bearer ..." },
      "format": "csv"
    }
  }
  ```

- `api_post` JSON:
  ```json
  {
    "name": "api_post",
    "arguments": {
      "url": "https://httpbin.org/post",
      "data": { "a": 1 },
      "headers": { "Content-Type": "application/json" },
      "format": "json"
    }
  }
  ```

## Rollout Steps
1. Implement `toCsv(result)` and `format` selection in all tool success paths.
2. Update shared error handler to accept `format` and render accordingly.
3. Update `inputSchema` for all tools to include `format` with `enum`.
4. Add explicit Zod validation for `format` (or `.passthrough()` if you prefer permissive acceptance).
5. Update tests to cover `csv` and `json` outputs across all tools.
6. Bump version in `package.json` to signal enhancement.
7. Optionally update `README.md` with usage examples showing `format`.

## Client Integration Notes
- Clients that list tools will now see the `format` parameter and available values via `inputSchema`.
- If a client does not provide `format`, it continues to receive JSON.
- CSV output is suitable for quick export, spreadsheet import, or piping into tooling that expects delimited text.
