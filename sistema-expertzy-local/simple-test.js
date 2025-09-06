const { chromium } = require('playwright');

async function simpleTest() {
    console.log('🚀 Teste simples de correções...');
    
    // Reiniciar servidor
    const { exec } = require('child_process');
    exec('pkill -f "python3 -m http.server"');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const serverProcess = exec('python3 -m http.server 8080', (error) => {
        if (error && !error.message.includes('Address already in use')) {
            console.error('Erro servidor:', error);
        }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const browser = await chromium.launch({ 
        headless: false, 
        slowMo: 2000,
        args: ['--disable-web-security'] 
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('📂 Abrindo sistema...');
        await page.goto('http://localhost:8080/di-processing/di-processor.html');
        
        console.log('⏳ Aguardando carregamento...');
        await page.waitForTimeout(3000);
        
        // Verificar se página carregou
        const title = await page.title();
        console.log(`Título da página: ${title}`);
        
        // Verificar se ConfigLoader foi carregado
        const configLoaderExists = await page.evaluate(() => {
            return typeof ConfigLoader !== 'undefined';
        });
        console.log(`ConfigLoader disponível: ${configLoaderExists}`);
        
        // Verificar se arquivos de configuração estão acessíveis
        const configTest = await page.evaluate(async () => {
            try {
                const response = await fetch('../shared/data/estados-brasil.json');
                const data = await response.json();
                return {
                    success: true,
                    estadosCount: data.estados?.length || 0
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        
        console.log('Estados JSON:', configTest);
        
        // Verificar moedas JSON
        const moedasTest = await page.evaluate(async () => {
            try {
                const response = await fetch('../shared/data/moedas-siscomex.json');
                const data = await response.json();
                return {
                    success: true,
                    moedasCount: data.moedas?.length || 0,
                    mappingKeys: Object.keys(data.mapeamento_rapido || {}).length
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        
        console.log('Moedas JSON:', moedasTest);
        
        // Capturar erros do console
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push(`${msg.type()}: ${msg.text()}`);
        });
        
        await page.waitForTimeout(2000);
        
        console.log('\n📋 Mensagens do console:');
        consoleMessages.forEach(msg => console.log(`  ${msg}`));
        
        await page.screenshot({ path: 'sistema-loaded.png' });
        console.log('📸 Screenshot salvo');
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await browser.close();
        serverProcess.kill();
    }
}

simpleTest().catch(console.error);