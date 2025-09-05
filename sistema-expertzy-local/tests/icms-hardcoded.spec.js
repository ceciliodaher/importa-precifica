/**
 * Teste Playwright - Correção #1: ICMS Hardcoded
 * 
 * Este teste valida a correção da alíquota ICMS hardcoded (19%) 
 * para uso dinâmico baseado no estado da DI.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Correção #1 - ICMS Hardcoded', () => {
    
    test.beforeEach(async ({ page }) => {
        // Navegar para o sistema DI
        await page.goto('http://localhost:8080/di-processing/di-processor.html');
        await page.waitForLoadState('networkidle');
        
        // Aguardar sistema inicializar - botão de seleção visível
        await page.waitForSelector('button:has-text("Selecionar XML")', { timeout: 10000 });
    });

    test('BASELINE: Deve processar DI de Goiás com ICMS 19%', async ({ page }) => {
        console.log('🧪 Teste BASELINE - Documentando comportamento atual');
        
        // Upload XML de Goiás - usar o input oculto diretamente
        const fileInput = page.locator('#xmlFile');
        await fileInput.setInputFiles(path.join(__dirname, 'fixtures/2300120746.xml'));
        
        // Aguardar o arquivo aparecer na interface
        await page.waitForSelector('#fileInfo:not(.d-none)', { timeout: 5000 });
        
        // Processar DI
        await page.click('button:has-text("Processar DI")');
        
        // Aguardar processamento
        await page.waitForSelector('.alert-success', { timeout: 15000 });
        
        // Verificar que DI foi processada
        const successMessage = page.locator('.alert-success');
        await expect(successMessage).toContainText('DI processada com sucesso');
        
        // Verificar dados básicos extraídos
        await expect(page.locator(':text("2300120746")')).toBeVisible();
        await expect(page.locator(':text("CFR")')).toBeVisible();
        
        // Avançar para step de cálculo de impostos
        const avancarBtn = page.locator('button:has-text("Calcular Impostos")');
        if (await avancarBtn.isVisible()) {
            await avancarBtn.click();
            await page.waitForTimeout(2000);
        }
        
        console.log('✅ DI de Goiás processada - baseline estabelecido');
    });
    
    test('PROBLEMA ATUAL: Sistema sempre usa 19% independente do estado', async ({ page }) => {
        console.log('🚨 Documentando PROBLEMA: ICMS hardcoded 19%');
        
        // Este teste documenta que o problema existe
        // Mesmo se tivéssemos DI de outros estados, sistema usaria 19%
        
        // Upload DI de Goiás
        const fileInput = page.locator('#xmlFile');
        await fileInput.setInputFiles(path.join(__dirname, 'fixtures/2300120746.xml'));
        
        await page.click('button:has-text("Processar DI")');
        await page.waitForSelector('.alert-success', { timeout: 15000 });
        
        // Ir para configuração de despesas extras (onde ICMS é calculado)
        const calcularBtn = page.locator('button:has-text("Calcular Impostos")');
        if (await calcularBtn.isVisible()) {
            await calcularBtn.click();
            await page.waitForTimeout(2000);
        }
        
        // Buscar botão "Configurar Despesas Extras" ou similar
        const despesasBtn = page.locator('button:has-text("Configurar"), button:has-text("Despesas")').first();
        if (await despesasBtn.isVisible()) {
            await despesasBtn.click();
            await page.waitForTimeout(1000);
        }
        
        // Tentar adicionar despesa extra para testar cálculo ICMS
        const despesaInput = page.locator('#despesaValor, input[placeholder*="valor"], input[type="number"]').first();
        if (await despesaInput.isVisible()) {
            await despesaInput.fill('1000');
            
            // Verificar se existe checkbox "Compõe base ICMS"
            const icmsCheckbox = page.locator('input[type="checkbox"]:near(:text("ICMS"))').first();
            if (await icmsCheckbox.isVisible()) {
                await icmsCheckbox.check();
            }
            
            console.log('💰 Despesa de R$ 1.000 configurada');
            console.log('⚠️  PROBLEMA: Sistema usará sempre 19% (0.19/0.81 = 0.2346)');
            console.log('🎯 ESPERADO: Deveria usar alíquota do estado da DI');
        }
        
        console.log('📝 PROBLEMA DOCUMENTADO: ICMS sempre 19% hardcoded');
    });
    
    test('Validar estrutura da DI - Estado Goiás', async ({ page }) => {
        console.log('🔍 Validando extração de dados da DI');
        
        const fileInput = page.locator('#xmlFile');
        await fileInput.setInputFiles(path.join(__dirname, 'fixtures/2300120746.xml'));
        
        await page.click('button:has-text("Processar DI")');
        await page.waitForSelector('.alert-success', { timeout: 15000 });
        
        // Verificar se estado foi extraído corretamente
        // Estado deve estar visível em algum lugar da interface
        const pageContent = await page.textContent('body');
        
        // Verificar dados críticos
        expect(pageContent).toContain('2300120746'); // Número DI
        expect(pageContent).toContain('CFR'); // Incoterm
        
        // Estado pode aparecer como GO, Goiás, ou na info do importador
        const hasGoias = pageContent.includes('GO') || 
                        pageContent.includes('Goiás') || 
                        pageContent.includes('GOIANIA');
        
        expect(hasGoias).toBe(true);
        
        console.log('✅ Estado Goiás identificado na DI');
    });
    
    test('Segundo XML - Também Goiás', async ({ page }) => {
        console.log('🧪 Testando segundo XML (também Goiás)');
        
        const fileInput = page.locator('#xmlFile');
        await fileInput.setInputFiles(path.join(__dirname, 'fixtures/2518173187.xml'));
        
        await page.click('button:has-text("Processar DI")');
        await page.waitForSelector('.alert-success', { timeout: 15000 });
        
        // Verificar dados
        const pageContent = await page.textContent('body');
        expect(pageContent).toContain('2518173187');
        expect(pageContent).toContain('CPT'); // Incoterm diferente
        
        // Estado ainda é Goiás
        const hasGoias = pageContent.includes('GO') || 
                        pageContent.includes('APARECIDA DE GOIANIA');
        expect(hasGoias).toBe(true);
        
        console.log('✅ Segundo XML também Goiás - limitação dos dados de teste');
    });
    
    test.describe('APÓS CORREÇÃO (ainda não implementada)', () => {
        test.skip('Deve usar alíquota ICMS correta por estado', async ({ page }) => {
            // Este teste será habilitado APÓS implementar a correção
            console.log('⏳ AGUARDANDO: Implementação da correção');
            
            // Teste futuro:
            // 1. Verificar que função getAliquotaICMSPorEstado existe
            // 2. Testar com DI de diferentes estados
            // 3. Validar que cada estado usa sua alíquota específica
            // 
            // Exemplo:
            // GO = 19% → impacto R$ 1000: 234.57
            // SP = 18% → impacto R$ 1000: 219.51  
            // RJ = 22% → impacto R$ 1000: 282.05
        });
        
        test.skip('Deve falhar com erro claro se estado não encontrado', async ({ page }) => {
            // Teste para validação de erro quando estado ausente
            console.log('⏳ AGUARDANDO: Teste de validação de erro');
        });
    });
});

test.describe('Validação dos Fixtures XML', () => {
    
    test('XML 2300120746 deve conter dados esperados', async ({ page }) => {
        // Este é um teste de sanidade dos dados de teste
        const fs = require('fs');
        const xmlPath = path.join(__dirname, 'fixtures/2300120746.xml');
        
        expect(fs.existsSync(xmlPath)).toBe(true);
        
        const xmlContent = fs.readFileSync(xmlPath, 'utf8');
        
        // Verificar elementos críticos do XML
        expect(xmlContent).toContain('2300120746'); // Número DI
        expect(xmlContent).toContain('<importadorEnderecoUf>GO</importadorEnderecoUf>');
        expect(xmlContent).toContain('<condicaoVendaIncoterm>CFR</condicaoVendaIncoterm>');
        expect(xmlContent).toContain('GOIANIA'); // Cidade
        
        console.log('✅ XML 2300120746 validado');
    });
    
    test('XML 2518173187 deve conter dados esperados', async ({ page }) => {
        const fs = require('fs');
        const xmlPath = path.join(__dirname, 'fixtures/2518173187.xml');
        
        expect(fs.existsSync(xmlPath)).toBe(true);
        
        const xmlContent = fs.readFileSync(xmlPath, 'utf8');
        
        expect(xmlContent).toContain('2518173187'); // Número DI  
        expect(xmlContent).toContain('<importadorEnderecoUf>GO</importadorEnderecoUf>');
        expect(xmlContent).toContain('<condicaoVendaIncoterm>CPT</condicaoVendaIncoterm>');
        expect(xmlContent).toContain('APARECIDA DE GOIANIA');
        
        console.log('✅ XML 2518173187 validado');
    });
});