// Teste simples para verificar se a API está funcionando
// Execute: node test-api.js

const http = require('http');

console.log('🔍 Testando API do backend...\n');

// Teste 1: Health Check
const healthCheck = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Health Check OK:', JSON.parse(data));
          resolve(true);
        } else {
          console.log('❌ Health Check Failed:', res.statusCode);
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Health Check Error:', err.message);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ Health Check Timeout');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
};

// Teste 2: Login
const testLogin = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: 'Admin',
      password: 'admin123'
    });

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Login OK:', JSON.parse(data));
          resolve(true);
        } else {
          console.log('❌ Login Failed:', res.statusCode);
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Login Error:', err.message);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
};

// Executar testes
const runTests = async () => {
  console.log('📊 Testando endpoints da API...\n');
  
  const healthOk = await healthCheck();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const loginOk = await testLogin();
  
  console.log('\n📋 Resumo dos Testes:');
  console.log('Health Check:', healthOk ? '✅' : '❌');
  console.log('Login:', loginOk ? '✅' : '❌');
  
  if (healthOk && loginOk) {
    console.log('\n🎉 API funcionando corretamente!');
    console.log('🌐 Acesse: http://localhost:5173');
  } else {
    console.log('\n⚠️  Alguns testes falharam.');
    console.log('💡 Verifique se o servidor está rodando: npm run dev');
  }
};

runTests();