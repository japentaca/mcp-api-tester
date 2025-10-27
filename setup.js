#!/usr/bin/env node
/**
 * Setup script for API Tester MCP Server
 *
 * This script helps configure the API Tester MCP server by:
 * 1. Creating the necessary directories
 * 2. Providing configuration instructions
 * 3. Testing the server setup
 */

import { readFile, writeFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MCP_SETTINGS_PATH = 'c:\\Users\\jntac\\AppData\\Roaming\\Code\\User\\globalStorage\\rooveterinaryinc.roo-cline\\settings\\mcp_settings.json';

async function setupMcpServer() {
  console.log('🚀 Setting up API Tester MCP Server...\n');

  try {
    // Test if the server can start
    console.log('✅ Testing server configuration...');
    const serverPath = join(__dirname, 'index.js');

    try {
      await access(serverPath);
      console.log('✅ Server file exists');
    } catch (error) {
      console.error('❌ Server file not found');
      return;
    }

    // Provide configuration instructions
    console.log('\n📋 Configuration Instructions:');
    console.log('='.repeat(50));
    console.log('\nTo add the API Tester MCP server to your configuration, add the following to your MCP settings file:');
    console.log(`📄 Location: ${MCP_SETTINGS_PATH}`);
    console.log('\nAdd this configuration to the "mcpServers" object:\n');

    const config = {
      "api-tester": {
        "command": "node",
        "args": [join(__dirname, "index.js")],
        "cwd": __dirname,
        "disabled": false,
        "alwaysAllow": [],
        "disabledTools": [],
        "env": {}
      }
    };

    console.log(JSON.stringify(config, null, 2));

    console.log('\n🔧 Manual Steps:');
    console.log('1. Open the MCP settings file in your editor');
    console.log('2. Add the configuration above to the "mcpServers" object');
    console.log('3. Save the file');
    console.log('4. Restart your MCP client');
    console.log('\n✅ After configuration, you will have access to these tools:');
    console.log('   - api_get: Test GET requests');
    console.log('   - api_post: Test POST requests');
    console.log('   - api_put: Test PUT requests');
    console.log('   - api_delete: Test DELETE requests');
    console.log('   - api_request: Generic HTTP method testing');

    console.log('\n📖 Example usage:');
    console.log('   api_get({ url: "https://api.example.com/users", headers: { "Authorization": "Bearer token" } })');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupMcpServer();