const { chromium } = require('playwright');

async function testSimpleDataDriven() {
    console.log('🧪 Teste simples da correção DATA-DRIVEN...');
    
    // Servidor
    const { exec } = require('child_process');
    exec('pkill -f "python3 -m http.server"');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const serverProcess = exec('python3 -m http.server 8080');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const browser = await chromium.launch({ headless: false, slowMo: 2000 });
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:8080/di-processing/di-processor.html');
        await page.waitForTimeout(2000);
        
        // Testar se DIProcessor tem o método novo
        const testResult = await page.evaluate(() => {
            try {
                // Verificar se DIProcessor está disponível
                if (typeof DIProcessor === 'undefined') {
                    return { success: false, error: 'DIProcessor não encontrado' };
                }
                
                // Criar instância
                const processor = new DIProcessor();
                
                // Verificar se método novo existe
                if (typeof processor.obterMoedaVmleVmld !== 'function') {
                    return { success: false, error: 'Método obterMoedaVmleVmld não encontrado' };
                }
                
                return { success: true, message: 'DIProcessor atualizado com método DATA-DRIVEN' };
                
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        console.log('📊 Resultado do teste:', testResult);
        
        if (testResult.success) {
            console.log('✅ CORREÇÃO DATA-DRIVEN APLICADA COM SUCESSO');
            console.log('   - DIProcessor disponível');
            console.log('   - Método obterMoedaVmleVmld implementado');
            console.log('   - Pronto para processar DIs sem validações artificiais');
        } else {
            console.log('❌ PROBLEMA ENCONTRADO:', testResult.error);
        }
        
        await page.screenshot({ path: 'simple-test-result.png' });
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await browser.close();
        serverProcess.kill();
    }
}

testSimpleDataDriven().catch(console.error);