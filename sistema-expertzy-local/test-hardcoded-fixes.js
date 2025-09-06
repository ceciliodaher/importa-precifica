const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testHardcodedFixes() {
    console.log('🚀 Iniciando teste de correções hardcoded...');
    
    const browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const page = await browser.newPage();
    
    try {
        // 1. Navegar para o sistema DI Processing
        console.log('📂 Carregando sistema DI Processing...');
        await page.goto('http://localhost:8080/sistema-expertzy-local/di-processing/di-processor.html');
        
        // 2. Carregar XML real
        console.log('📄 Carregando XML real da DI...');
        const xmlPath = path.join(__dirname, 'samples', '2300120746.xml');
        const xmlExists = fs.existsSync(xmlPath);
        
        if (!xmlExists) {
            throw new Error(`Arquivo XML não encontrado: ${xmlPath}`);
        }
        
        // Upload do arquivo XML
        const fileInput = await page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(xmlPath);
        
        // Aguardar processamento
        console.log('⏳ Aguardando processamento da DI...');
        await page.waitForTimeout(3000);
        
        // 3. Verificar se estado foi extraído corretamente da DI (sem fallback 'GO')
        console.log('🔍 Verificando extração do estado...');
        const estadoElement = await page.locator('text=/Estado.*:/').first();
        const estadoTexto = await estadoElement.textContent();
        console.log(`Estado encontrado: ${estadoTexto}`);
        
        // 4. Tentar processar impostos
        console.log('💰 Processando cálculos de impostos...');
        const calcularButton = await page.locator('button:has-text("Calcular")').first();
        
        if (await calcularButton.isVisible()) {
            await calcularButton.click();
            await page.waitForTimeout(2000);
        }
        
        // 5. Verificar se não há erros de fallback
        const errorMessages = await page.locator('.error, .alert-danger, [class*="error"]').allTextContents();
        const fallbackErrors = errorMessages.filter(msg => 
            msg.includes('GO') || 
            msg.includes('220') || 
            msg.includes('Estado não encontrado') ||
            msg.includes('Moeda não reconhecida')
        );
        
        if (fallbackErrors.length > 0) {
            console.log('❌ Erros de fallback encontrados:');
            fallbackErrors.forEach(error => console.log(`  - ${error}`));
        } else {
            console.log('✅ Nenhum erro de fallback detectado');
        }
        
        // 6. Verificar console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        await page.waitForTimeout(1000);
        
        if (consoleErrors.length > 0) {
            console.log('⚠️ Erros no console:');
            consoleErrors.forEach(error => console.log(`  - ${error}`));
        }
        
        // 7. Capturar screenshot do resultado
        await page.screenshot({ path: 'test-result.png', fullPage: true });
        console.log('📸 Screenshot salvo como test-result.png');
        
        console.log('✅ Teste concluído com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error);
        await page.screenshot({ path: 'test-error.png', fullPage: true });
    } finally {
        await browser.close();
        
        // Parar servidor
        try {
            const pid = fs.readFileSync('server.pid', 'utf8').trim();
            require('child_process').exec(`kill ${pid}`);
            fs.unlinkSync('server.pid');
        } catch (e) {
            console.log('Servidor já parado');
        }
    }
}

// Executar teste
testHardcodedFixes().catch(console.error);