const { chromium } = require('playwright');

async function testDataDrivenFix() {
    console.log('🚀 Testando correção DATA-DRIVEN do processamento de moedas...');
    
    // Iniciar servidor em background
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
        slowMo: 1500
    });
    
    const page = await browser.newPage();
    
    // Capturar logs do console
    const consoleMessages = [];
    page.on('console', msg => {
        const message = `${msg.type()}: ${msg.text()}`;
        consoleMessages.push(message);
        if (msg.type() === 'error') {
            console.log('❌ ' + message);
        } else if (message.includes('DATA-DRIVEN') || message.includes('Moeda VMLE/VMLD')) {
            console.log('✅ ' + message);
        }
    });
    
    try {
        console.log('📂 Carregando sistema DI Processing...');
        await page.goto('http://localhost:8080/di-processing/di-processor.html');
        
        console.log('⏳ Aguardando inicialização...');
        await page.waitForTimeout(3000);
        
        // Simular upload do arquivo XML usando input file
        console.log('📄 Simulando upload de DI 2300120746.xml...');
        const fileInput = await page.locator('input[type="file"]').first();
        
        if (await fileInput.isVisible()) {
            const xmlPath = require('path').join(__dirname, 'samples', '2300120746.xml');
            await fileInput.setInputFiles(xmlPath);
            
            console.log('⏳ Aguardando processamento...');
            await page.waitForTimeout(5000);
            
            // Verificar se processou sem erro
            const hasError = consoleMessages.some(msg => 
                msg.includes('Nenhuma moeda com taxa compatível') ||
                msg.includes('Error: ')
            );
            
            const hasDataDrivenSuccess = consoleMessages.some(msg =>
                msg.includes('Moeda processada DATA-DRIVEN') ||
                msg.includes('Moeda VMLE/VMLD: 220')
            );
            
            if (hasError) {
                console.log('❌ TESTE FALHOU - Ainda há erros de processamento');
            } else if (hasDataDrivenSuccess) {
                console.log('✅ TESTE PASSOU - Processamento DATA-DRIVEN funcionando');
            } else {
                console.log('⚠️ TESTE INCONCLUSIVO - Verifique logs');
            }
            
        } else {
            console.log('⚠️ Input de arquivo não encontrado');
        }
        
        // Logs completos
        console.log('\n📋 LOGS COMPLETOS:');
        consoleMessages.forEach(msg => console.log(`  ${msg}`));
        
        await page.screenshot({ path: 'data-driven-test.png', fullPage: true });
        console.log('📸 Screenshot salvo');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    } finally {
        await browser.close();
        serverProcess.kill();
    }
}

testDataDrivenFix().catch(console.error);