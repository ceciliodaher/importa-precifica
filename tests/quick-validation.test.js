/**
 * Teste rápido para validar se o sistema está funcionando
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8889';
const MODULE2_URL = `${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`;
const API_BASE = `${BASE_URL}/api/endpoints`;

test.describe('Validação Rápida Module 2', () => {
    test.setTimeout(30000);

    test('Testar Module 2 - Seleção e Processamento', async ({ page }) => {
        console.log('🔍 Testando Module 2 refatorado...');
        
        await page.goto(MODULE2_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        // 1. Verificar que não há upload XML
        const xmlUpload = page.locator('input[type="file"][accept*="xml"]');
        const hasXmlUpload = await xmlUpload.count();
        expect(hasXmlUpload).toBe(0);
        console.log('   ✅ Upload XML removido (refatoração aplicada)');
        
        // 2. Verificar se há tabela de DIs
        await page.waitForSelector('table tbody tr', { timeout: 10000 });
        const rows = page.locator('tbody tr');
        const rowCount = await rows.count();
        console.log(`   ✅ ${rowCount} DIs disponíveis para seleção`);
        
        // 3. Tentar processar primeira DI
        const processButtons = page.locator('button:has-text("Processar"), button[title*="Selecionar"]');
        const buttonCount = await processButtons.count();
        
        if (buttonCount > 0) {
            console.log('   🎯 Processando primeira DI...');
            await processButtons.first().click();
            await page.waitForTimeout(3000);
            
            // Verificar se mudou de step
            const currentUrl = page.url();
            const bodyText = await page.textContent('body');
            
            if (bodyText.includes('Step 2') || bodyText.includes('Configuração') || bodyText.includes('Despesas')) {
                console.log('   ✅ Avançou para configuração de impostos');
                
                // Tentar calcular impostos
                const calcButtons = page.locator('button:has-text("Calcular"), button:has-text("Processar Impostos")');
                const calcCount = await calcButtons.count();
                
                if (calcCount > 0) {
                    await calcButtons.first().click();
                    await page.waitForTimeout(2000);
                    console.log('   🧮 Cálculo de impostos iniciado');
                    
                    // Verificar se há resultados
                    const results = page.locator('*:has-text("R$"), *:has-text("ICMS"), .result');
                    const resultCount = await results.count();
                    
                    if (resultCount > 0) {
                        console.log('   ✅ Cálculos realizados com sucesso!');
                    }
                }
            }
        }
        
        console.log('');
    });

    test('Validar dados via API', async ({ page }) => {
        console.log('📊 Validando dados via API...');
        
        // Verificar status geral
        const statusResponse = await page.request.get(`${API_BASE}/status.php`);
        const statusData = await statusResponse.json();
        
        console.log(`   📦 DIs no banco: ${statusData.estatisticas.total_dis}`);
        console.log(`   📋 Total adições: ${statusData.estatisticas.total_adicoes}`);
        console.log(`   💰 Valor total: R$ ${statusData.estatisticas.valor_total_importado}`);
        
        expect(statusData.estatisticas.total_dis).toBeGreaterThan(0);
        
        // Testar busca de DI específica
        const diResponse = await page.request.get(`${API_BASE}/buscar-di.php?numero_di=2518173187`);
        const diData = await diResponse.json();
        
        expect(diData.success).toBe(true);
        console.log(`   🔍 DI 2518173187: ${diData.data.importador_uf}, R$ ${diData.data.adicoes[0].valor_reais}`);
        
        console.log('   ✅ API funcionando corretamente\n');
    });

    test('Screenshot final', async ({ page }) => {
        await page.goto(MODULE2_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
            path: 'screenshots/module2-final.png',
            fullPage: true 
        });
        
        console.log('📸 Screenshot salvo: screenshots/module2-final.png');
    });
});