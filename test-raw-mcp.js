#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testWithRawMCP() {
  console.log('🚀 Testing raw MCP protocol performance...');
  
  const mcpProcess = spawn('node', [join(__dirname, 'index.js')], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let stepStartTime = performance.now();
  let currentStep = 'initialization';

  mcpProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('📨 Raw output:', output.trim());
    
    try {
      const lines = output.trim().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          const parsed = JSON.parse(line);
          
          if (parsed.id === 1 && currentStep === 'initialization') {
            const time = performance.now() - stepStartTime;
            console.log(`✅ Initialization: ${time.toFixed(2)}ms`);
            
            // Send tools list request
            currentStep = 'tools_list';
            stepStartTime = performance.now();
            const toolsRequest = {
              jsonrpc: "2.0",
              id: 2,
              method: "tools/list",
              params: {}
            };
            mcpProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');
          }
          
          if (parsed.id === 2 && currentStep === 'tools_list') {
            const time = performance.now() - stepStartTime;
            console.log(`✅ Tools list: ${time.toFixed(2)}ms`);
            
            // Send CSV request
            currentStep = 'csv_request';
            stepStartTime = performance.now();
            const csvRequest = {
              jsonrpc: "2.0",
              id: 3,
              method: "tools/call",
              params: {
                name: "api_get",
                arguments: {
                  url: "https://api.argentinadatos.com/v1/feriados/2025",
                  format: "csv"
                }
              }
            };
            console.log('📤 Sending CSV request...');
            mcpProcess.stdin.write(JSON.stringify(csvRequest) + '\n');
          }
          
          if (parsed.id === 3 && currentStep === 'csv_request') {
            const time = performance.now() - stepStartTime;
            console.log(`✅ CSV request: ${time.toFixed(2)}ms`);
            
            if (parsed.result && parsed.result.content) {
              const csvContent = parsed.result.content[0].text;
              console.log(`📊 CSV length: ${csvContent.length} characters`);
              console.log('\n📋 CSV Preview:');
              console.log(csvContent.substring(0, 200) + '...');
            }
            
            // End test
            setTimeout(() => {
              mcpProcess.kill();
              console.log('\n🎯 Test completed!');
              process.exit(0);
            }, 500);
          }
          
          if (parsed.error) {
            console.error('❌ MCP Error:', parsed.error);
            mcpProcess.kill();
            process.exit(1);
          }
        }
      }
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    const error = data.toString();
    console.error('❌ STDERR:', error);
  });

  mcpProcess.on('error', (error) => {
    console.error('❌ Process error:', error.message);
    process.exit(1);
  });

  // Initialize
  setTimeout(() => {
    console.log('📤 Sending initialization request...');
    const initRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" }
      }
    };
    mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');
  }, 500);
}

testWithRawMCP().catch(console.error);