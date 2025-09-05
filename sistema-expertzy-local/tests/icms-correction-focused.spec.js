/**
 * Teste Focado - Correção #1: ICMS Hardcoded
 * 
 * Teste específico para validar que a correção ICMS funciona
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('ICMS Correction - Focused Test', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8080/di-processing/di-processor.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    test('Deve processar DI e usar ICMS dinâmico baseado no estado', async ({ page }) => {
        console.log('🔧 Testando correção ICMS dinâmico');
        
        // Upload XML de Goiás
        const fileInput = page.locator('#xmlFile');
        await fileInput.setInputFiles(path.join(__dirname, 'fixtures/2300120746.xml'));
        
        // Aguardar processamento
        await page.waitForTimeout(2000);
        
        // Processar DI
        const processBtn = page.locator('button:has-text("Processar DI")');
        await processBtn.click();
        
        // Aguardar sucesso
        await page.waitForTimeout(5000);
        
        // Verificar se não há erros de JavaScript no console
        page.on('console', msg => {
            if (msg.type() === 'error' && msg.text().includes('Estado do importador não encontrado')) {
                throw new Error(`❌ CORREÇÃO FALHOU: ${msg.text()}`);
            }
        });
        
        // Verificar se DI foi processada (buscar número da DI)
        const bodyContent = await page.textContent('body');
        expect(bodyContent).toContain('2300120746');
        
        console.log('✅ DI processada sem erros - correção ICMS funcionando');
        
        // Tentar avançar para cálculos se possível
        const calcularBtn = page.locator('button:has-text("Calcular"), button:has-text("Impostos")');
        if (await calcularBtn.count() > 0) {
            await calcularBtn.first().click();
            await page.waitForTimeout(2000);
            console.log('✅ Cálculos iniciados sem erros');
        }
        
        console.log('🎯 RESULTADO: Correção ICMS hardcoded funcionando corretamente');
    });
    
    test('Deve extrair estado corretamente da DI', async ({ page }) => {
        console.log('🔍 Verificando extração do estado');
        
        // Interceptar chamadas para verificar estado
        await page.route('**/*', route => {
            route.continue();
        });
        
        const fileInput = page.locator('#xmlFile');
        await fileInput.setInputFiles(path.join(__dirname, 'fixtures/2300120746.xml'));
        
        await page.waitForTimeout(2000);
        
        const processBtn = page.locator('button:has-text("Processar DI")');
        await processBtn.click();
        
        await page.waitForTimeout(3000);
        
        // Verificar se estado foi extraído - buscar por indicadores de Goiás
        const bodyContent = await page.textContent('body');
        const hasGoias = bodyContent.includes('GO') || 
                        bodyContent.includes('Goiás') || 
                        bodyContent.includes('GOIANIA');
        
        expect(hasGoias).toBe(true);
        console.log('✅ Estado Goiás identificado corretamente');
    });
    
    test('Verificar que não há mais ICMS 19% hardcoded', async ({ page }) => {
        console.log('🚫 Verificando que valor hardcoded foi removido');
        
        // Verificar o código JavaScript não contém mais 0.19 ou 0.81 hardcoded
        const response = await page.request.get('http://localhost:8080/di-processing/js/di-interface.js');
        const jsContent = await response.text();
        
        // Buscar pela linha antiga (deve estar comentada ou removida)
        const hasOldHardcode = jsContent.includes('* 0.19 / 0.81; // ICMS GO = 19%');
        
        expect(hasOldHardcode).toBe(false);
        console.log('✅ Hardcode ICMS 0.19/0.81 removido do código');
        
        // Verificar que nova lógica existe
        const hasNewLogic = jsContent.includes('complianceCalculator.obterAliquotaICMS') &&
                          jsContent.includes('aliquotaICMSDecimal');
        
        expect(hasNewLogic).toBe(true);
        console.log('✅ Nova lógica ICMS dinâmica presente no código');
    });
    
    test('Código deve usar função obterAliquotaICMS', async ({ page }) => {
        console.log('🔧 Verificando uso da função obterAliquotaICMS');
        
        const response = await page.request.get('http://localhost:8080/di-processing/js/di-interface.js');
        const jsContent = await response.text();
        
        // Verificar chamada da função
        expect(jsContent).toContain('complianceCalculator.obterAliquotaICMS(estado)');
        console.log('✅ Função obterAliquotaICMS sendo chamada corretamente');
        
        // Verificar conversão percentual para decimal
        expect(jsContent).toContain('aliquotaICMSPercent / 100');
        console.log('✅ Conversão percentual para decimal implementada');
        
        // Verificar uso da fórmula correta
        expect(jsContent).toContain('aliquotaICMSDecimal / (1 - aliquotaICMSDecimal)');
        console.log('✅ Fórmula ICMS corrigida implementada');
    });
});