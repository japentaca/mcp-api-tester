#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMCPClient() {
  console.log('🚀 Testing MCP Client performance...');
  
  const transport = new StdioClientTransport({
    command: 'node',
    args: [join(__dirname, 'index.js')]
  });

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0'
    },
    {
      capabilities: {}
    }
  );

  try {
    console.log('⏱️  Connecting to MCP server...');
    const connectStart = performance.now();
    await client.connect(transport);
    const connectTime = performance.now() - connectStart;
    console.log(`✅ Connected in ${connectTime.toFixed(2)}ms`);

    console.log('⏱️  Listing tools...');
    const listStart = performance.now();
    const tools = await client.listTools();
    const listTime = performance.now() - listStart;
    console.log(`✅ Tools listed in ${listTime.toFixed(2)}ms`);
    console.log(`📋 Found ${tools.tools.length} tools`);

    console.log('⏱️  Testing CSV request...');
    const csvStart = performance.now();
    const result = await client.callTool('api_get', {
      url: 'https://api.argentinadatos.com/v1/feriados/2025',
      format: 'csv'
    });
    const csvTime = performance.now() - csvStart;
    
    console.log(`✅ CSV request completed in ${csvTime.toFixed(2)}ms`);
    
    // Extract CSV content from result
    const csvContent = result.content[0].text;
    console.log(`📊 CSV length: ${csvContent.length} characters`);
    console.log('\n📋 First 200 chars of CSV:');
    console.log(csvContent.substring(0, 200) + '...');

    await client.close();
    console.log('\n🎯 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.close();
    process.exit(1);
  }
}

testMCPClient().catch(console.error);