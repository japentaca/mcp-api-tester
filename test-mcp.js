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
  csvGet: false,
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
  
  if ((output.includes('POST') && output.includes('true') && output.includes('jsonplaceholder.typicode.com/posts')) ||
      (output.includes('"id":4') && output.includes('true'))) {
    testResults.apiPost = true;
    console.log('✅ API POST ejecutado exitosamente');
  }

  const csvHeader = 'success,method,url,status,statusText,responseTime,error,code,headers,data,requestData';
  if (output.includes(csvHeader) && output.includes('GET') && output.includes('jsonplaceholder.typicode.com')) {
    testResults.csvGet = true;
    console.log('✅ API GET CSV ejecutado exitosamente');
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
  if (!testResults.apiPost) {
    const postOk = (responseData.includes('"id":4') && responseData.includes('true')) ||
                   (responseData.includes('jsonplaceholder.typicode.com/posts') && responseData.includes('POST') && responseData.includes('true'));
    if (postOk) {
      testResults.apiPost = true;
    }
  }
  
  // Mostrar resumen de resultados
  console.log('\n📊 Resumen de pruebas:');
  console.log(`   Inicialización: ${testResults.initialization ? '✅' : '❌'}`);
  console.log(`   Lista de herramientas: ${testResults.toolsList ? '✅' : '❌'}`);
  console.log(`   API POST: ${testResults.apiPost ? '✅' : '❌'}`);
  console.log(`   API GET (CSV): ${testResults.csvGet ? '✅' : '❌'}`);
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

// 3. Probar api_get con formato CSV
setTimeout(() => {
  const apiGetCsvRequest = {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "api_get",
      arguments: {
        url: "https://jsonplaceholder.typicode.com/posts/1",
        format: "csv"
      }
    }
  };
  console.log('📨 Enviando solicitud api_get (CSV)...');
  mcpProcess.stdin.write(JSON.stringify(apiGetCsvRequest) + '\n');
}, 2000);

// 4. Probar api_post
setTimeout(() => {
  const apiPostRequest = {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "api_post",
      arguments: {
        url: "https://jsonplaceholder.typicode.com/posts",
        data: { test: "data", message: "Prueba del MCP api-tester" },
        headers: { "Content-Type": "application/json" }
      }
    }
  };
  console.log('📨 Enviando solicitud api_post...');
  mcpProcess.stdin.write(JSON.stringify(apiPostRequest) + '\n');
}, 4000);

// 5. Terminar el proceso después de 15 segundos
setTimeout(() => {
  console.log('\n⏰ Terminando prueba...');
  mcpProcess.kill();
}, 15000);
