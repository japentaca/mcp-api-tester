#!/usr/bin/env node

/**
 * Script de prueba para verificar el funcionamiento del MCP api-tester
 * 
 * Este script:
 * 1. Inicia el servidor MCP
 * 2. Envía solicitudes de inicialización
 * 3. Lista las herramientas disponibles
 * 4. Prueba la funcionalidad api_post
 * 5. Verifica que no hay errores de Zod
 * 
 * Uso: node test-mcp.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Iniciando prueba del MCP api-tester...');
console.log('📁 Directorio:', __dirname);

// Crear el proceso del MCP
const mcpProcess = spawn('node', [join(__dirname, 'index.js')], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseData = '';
let testResults = {
  initialization: false,
  toolsList: false,
  apiPost: false,
  noZodErrors: true
};

mcpProcess.stdout.on('data', (data) => {
  const output = data.toString();
  responseData += output;
  
  // Verificar respuestas exitosas
  if (output.includes('"result"') && output.includes('"id":1')) {
    testResults.initialization = true;
    console.log('✅ Inicialización exitosa');
  }
  
  if (output.includes('"tools"') && output.includes('api_post')) {
    testResults.toolsList = true;
    console.log('✅ Lista de herramientas obtenida');
  }
  
  if (output.includes('"success": true') && output.includes('httpbin.org')) {
    testResults.apiPost = true;
    console.log('✅ API POST ejecutado exitosamente');
  }
  
  // Verificar errores de Zod
  if (output.includes('_zod') || output.includes('ZodError')) {
    testResults.noZodErrors = false;
    console.log('❌ Error de Zod detectado');
  }
  
  console.log('📤 MCP Output:', output.trim());
});

mcpProcess.stderr.on('data', (data) => {
  const error = data.toString();
  console.error('❌ MCP Error:', error);
  
  // Verificar errores de Zod en stderr también
  if (error.includes('_zod') || error.includes('ZodError')) {
    testResults.noZodErrors = false;
  }
});

mcpProcess.on('close', (code) => {
  console.log(`\n🏁 MCP process terminado con código ${code}`);
  
  // Mostrar resumen de resultados
  console.log('\n📊 Resumen de pruebas:');
  console.log(`   Inicialización: ${testResults.initialization ? '✅' : '❌'}`);
  console.log(`   Lista de herramientas: ${testResults.toolsList ? '✅' : '❌'}`);
  console.log(`   API POST: ${testResults.apiPost ? '✅' : '❌'}`);
  console.log(`   Sin errores de Zod: ${testResults.noZodErrors ? '✅' : '❌'}`);
  
  const allPassed = Object.values(testResults).every(result => result === true);
  console.log(`\n🎯 Estado general: ${allPassed ? '✅ TODAS LAS PRUEBAS PASARON' : '❌ ALGUNAS PRUEBAS FALLARON'}`);
});

// 1. Enviar solicitud de inicialización
const initRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    }
  }
};

console.log('📨 Enviando solicitud de inicialización...');
mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');

// 2. Solicitar lista de herramientas
setTimeout(() => {
  const toolsRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  };
  
  console.log('📨 Enviando solicitud de lista de herramientas...');
  mcpProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');
}, 1000);

// 3. Probar api_post
setTimeout(() => {
  const apiPostRequest = {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "api_post",
      arguments: {
        url: "https://httpbin.org/post",
        data: { test: "data", message: "Prueba del MCP api-tester" },
        headers: { "Content-Type": "application/json" }
      }
    }
  };
  
  console.log('📨 Enviando solicitud api_post...');
  mcpProcess.stdin.write(JSON.stringify(apiPostRequest) + '\n');
}, 2000);

// 4. Terminar el proceso después de 6 segundos
setTimeout(() => {
  console.log('\n⏰ Terminando prueba...');
  mcpProcess.kill();
}, 6000);