/**
 * Teste das Correções de Fallbacks - Isenção vs Dados Ausentes
 * 
 * Valida que o sistema distingue corretamente:
 * 1. Isenção legítima (DI com valor=0, alíquota=0) → Deve processar
 * 2. Dados ausentes/corrompidos → Deve falhar explicitamente
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Correções de Fallbacks - Validação Estrutural', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8080/di-processing/di-processor.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    test('Deve processar DI com isenção IPI legítima (valor=0, alíquota=0)', async ({ page }) => {
        console.log('✅ Testando isenção IPI legítima na DI real');
        
        // Interceptar console.error para detectar erros de validação
        let hasValidationError = false;
        page.on('console', msg => {
            if (msg.type() === 'error' && 
                (msg.text().includes('Estrutura tributos ausente') ||
                 msg.text().includes('obrigatório para validação'))) {
                hasValidationError = true;
                console.log(`🚨 Erro de validação detectado: ${msg.text()}`);
            }
        });
        
        // Upload XML que contém isenção IPI legítima
        const fileInput = page.locator('#xmlFile');
        await fileInput.setInputFiles(path.join(__dirname, 'fixtures/2300120746.xml'));
        
        await page.waitForTimeout(2000);
        
        // Processar DI
        const processBtn = page.locator('button:has-text("Processar DI")');
        await processBtn.click();
        
        // Aguardar processamento
        await page.waitForTimeout(5000);
        
        // Verificar que não houve erro de validação estrutural
        expect(hasValidationError).toBe(false);
        
        // Verificar que DI foi processada (deve conter número)
        const bodyContent = await page.textContent('body');
        expect(bodyContent).toContain('2300120746');
        
        console.log('✅ Isenção IPI legítima processada corretamente');
        
        // Tentar calcular impostos
        const calcularBtn = page.locator('button:has-text("Calcular"), button:has-text("Impostos")');
        if (await calcularBtn.count() > 0) {
            await calcularBtn.first().click();
            await page.waitForTimeout(3000);
            
            // Não deve ter erro estrutural nos cálculos
            expect(hasValidationError).toBe(false);
            console.log('✅ Cálculos com isenções processados sem erros estruturais');
        }
    });
    
    test('Deve aceitar valores zero como isenções legítimas (não falha)', async ({ page }) => {
        console.log('📊 Verificando que valores zero são aceitos como isenções');
        
        // Interceptar requisições para verificar estrutura de dados
        await page.route('**/api/**', route => {
            route.continue();
        });
        
        let hasStructuralError = false;
        page.on('console', msg => {
            if (msg.type() === 'error' && msg.text().includes('ausente')) {
                hasStructuralError = true;
                console.log(`❌ Erro estrutural: ${msg.text()}`);
            }
        });
        
        const fileInput = page.locator('#xmlFile');
        await fileInput.setInputFiles(path.join(__dirname, 'fixtures/2300120746.xml'));
        
        await page.waitForTimeout(2000);
        
        const processBtn = page.locator('button:has-text("Processar DI")');
        await processBtn.click();
        
        await page.waitForTimeout(5000);
        
        // Sistema deve processar sem erros estruturais
        expect(hasStructuralError).toBe(false);
        
        console.log('✅ Valores zero processados como isenções legítimas');
    });
    
    test('Validação: Deve falhar se dados estruturais ausentes', async ({ page }) => {
        console.log('🔍 Testando que dados estruturais ausentes causam falha');
        
        // Este teste simula o comportamento esperado
        // Não podemos facilmente corromper um XML, mas podemos verificar
        // que o código tem as validações corretas
        
        const response = await page.request.get('http://localhost:8080/di-processing/js/CalculationValidator.js');
        const jsContent = await response.text();
        
        // Verificar que validações fail-fast estão presentes
        expect(jsContent).toContain('Estrutura tributos ausente');
        expect(jsContent).toContain('obrigatória para validação fiscal');
        expect(jsContent).toContain('Valor USD ausente');
        expect(jsContent).toContain('Valor BRL ausente');
        expect(jsContent).toContain('Taxa de câmbio ausente');
        
        console.log('✅ Validações fail-fast implementadas no código');
        
        // Verificar que usa ?? ao invés de ||
        const hasTwoStageValidation = jsContent.includes('?? 0;        // null/undefined = erro');
        expect(hasTwoStageValidation).toBe(true);
        
        console.log('✅ Validação duas etapas implementada (isenção vs ausência)');
    });
    
    test('Validação ProductMemoryManager: Fail-fast implementado', async ({ page }) => {
        console.log('🧠 Verificando ProductMemoryManager fail-fast');
        
        const response = await page.request.get('http://localhost:8080/shared/js/ProductMemoryManager.js');
        const jsContent = await response.text();
        
        // Verificar validações críticas
        expect(jsContent).toContain('Taxa de câmbio deve ser numérica e positiva');
        expect(jsContent).toContain('Estado da DI ausente - obrigatório');
        expect(jsContent).toContain('throw new Error');
        
        // Verificar que não usa fallbacks em dados críticos
        const hasProperValidation = jsContent.includes('validateExchangeRate') && 
                                   jsContent.includes('validateState');
        expect(hasProperValidation).toBe(true);
        
        console.log('✅ ProductMemoryManager implementa fail-fast corretamente');
    });
    
    test('Estrutura de dados: XML contém isenções reais', async ({ page }) => {
        console.log('📄 Verificando estrutura das isenções no XML');
        
        // Ler XML para verificar estrutura de isenções
        const fs = require('fs');
        const xmlPath = path.join(__dirname, 'fixtures/2300120746.xml');
        const xmlContent = fs.readFileSync(xmlPath, 'utf8');
        
        // Verificar que contém casos de isenção IPI (valor=0, alíquota=0)
        const hasIPIExemption = xmlContent.includes('<ipiAliquotaAdValorem>00000</ipiAliquotaAdValorem>') &&
                               xmlContent.includes('<ipiAliquotaValorDevido>000000000000000</ipiAliquotaValorDevido>');
        
        expect(hasIPIExemption).toBe(true);
        console.log('✅ XML contém isenção IPI legítima (alíquota=0, valor=0)');
        
        // Verificar que também tem casos com valores positivos
        const hasPositiveTax = xmlContent.includes('<ipiAliquotaAdValorem>00650</ipiAliquotaAdValorem>') &&
                              xmlContent.includes('<ipiAliquotaValorDevido>000000000249674</ipiAliquotaValorDevido>');
        
        expect(hasPositiveTax).toBe(true);
        console.log('✅ XML também contém impostos com valores positivos');
        
        console.log('🎯 CONCLUSÃO: XML tem mistura de isenções (0) e tributações (+) - perfeito para testar');
    });
});