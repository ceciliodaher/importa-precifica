const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

let PORT = 8080;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.xml': 'text/xml',
  '.ico': 'image/x-icon'
};

/**
 * Verifica se uma porta está disponível
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close(() => {
        resolve(true);
      });
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Encontra a primeira porta disponível a partir da porta inicial
 */
async function findAvailablePort(startPort = 8080) {
  let port = startPort;
  
  while (port < startPort + 100) { // Tenta até 100 portas à frente
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  
  throw new Error('Nenhuma porta disponível encontrada');
}

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Rota padrão para index.html
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './sistema-importacao.html';
  }

  // Prevenir acesso a arquivos fora do diretório
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const extname = path.extname(safePath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(safePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Arquivo não encontrado
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - Arquivo não encontrado</h1>', 'utf-8');
      } else {
        // Erro do servidor
        res.writeHead(500);
        res.end(`Erro do servidor: ${error.code}`, 'utf-8');
      }
    } else {
      // Sucesso
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*', // Permitir CORS
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end(content, 'utf-8');
    }
  });
});

// Inicializar servidor com detecção automática de porta
async function startServer() {
  try {
    console.log('🔍 Procurando porta disponível...');
    PORT = await findAvailablePort(8080);
    
    server.listen(PORT, () => {
      console.log(`
========================================
   Sistema Expertzy - Servidor Local
========================================
   
✅ Servidor rodando em: http://localhost:${PORT}

📁 Páginas disponíveis:
   - Sistema principal: http://localhost:${PORT}/sistema-importacao.html  
   - Landing page: http://localhost:${PORT}/index.html

⚡ Para parar o servidor: Ctrl+C

${PORT !== 8080 ? `⚠️  Porta 8080 ocupada, usando porta ${PORT}` : ''}

========================================
      `);
    });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error.message);
    process.exit(1);
  }
}

// Iniciar servidor
startServer();