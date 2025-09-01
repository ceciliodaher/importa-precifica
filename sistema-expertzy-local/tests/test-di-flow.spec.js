/**
 * Teste do fluxo completo DI: XML → ComplianceCalculator → ItemCalculator → exportCroquiNF
 * Verifica se ICMS/IPI por item estão sendo calculados corretamente
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Sistema DI - Fluxo Completo FASE 2', () => {
    
    test('Deve processar DI 2300120746 e mostrar ICMS/IPI por item no croqui', async ({ page }) => {
        // Navegar para o processador DI
        await page.goto('http://localhost:8080/di-processing/di-processor.html');
        
        // Aguardar carregamento do sistema
        await page.waitForFunction(() => 
            window.diProcessor && window.complianceCalculator && window.ItemCalculator
        );
        
        // Upload do arquivo XML de teste
        const xmlPath = path.join(__dirname, '../../orientacoes/2300120746.xml');
        await page.setInputFiles('#xmlFile', xmlPath);
        
        // Processar DI
        await page.click('button[onclick="processarDI()"]');
        
        // Aguardar processamento
        await page.waitForSelector('#step2', { state: 'visible' });
        
        // Verificar se DI foi carregada corretamente
        const diNumber = await page.textContent('#diNumber');
        expect(diNumber).toBe('2300120746');
        
        // Avançar para cálculo de impostos
        await page.click('button[onclick="calcularImpostos()"]');
        
        // Aguardar cálculos
        await page.waitForSelector('#step3', { state: 'visible' });
        
        // Verificar se calculation está disponível globalmente
        const hasCalculation = await page.evaluate(() => {
            return window.currentCalculation && 
                   window.currentCalculation.produtos_individuais &&
                   window.currentCalculation.produtos_individuais.length > 0;
        });
        
        expect(hasCalculation).toBe(true);
        
        // Verificar produtos individuais
        const produtosIndividuais = await page.evaluate(() => {
            return window.currentCalculation.produtos_individuais;
        });
        
        console.log('📦 Produtos individuais encontrados:', produtosIndividuais.length);
        
        // Verificar se cada produto tem ICMS/IPI calculados
        for (const produto of produtosIndividuais) {
            expect(produto.icms_item).toBeGreaterThan(0);
            expect(produto.ipi_item).toBeGreaterThanOrEqual(0); // IPI pode ser 0
            expect(produto.base_icms_item).toBeGreaterThan(0);
            
            console.log(`✅ Produto ${produto.adicao_numero}: ICMS R$ ${produto.icms_item.toFixed(2)}, IPI R$ ${produto.ipi_item.toFixed(2)}`);
        }
        
        // Avançar para exports
        await page.click('button[onclick="avancarStep(4)"]');
        await page.waitForSelector('#step4', { state: 'visible' });
        
        // Testar exportação do croqui
        await page.click('button[onclick="exportarCroquiNF()"]');
        
        // Verificar se o croqui foi gerado sem erros
        const consoleLogs = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleLogs.push(msg.text());
            }
        });
        
        // Aguardar um momento para capturar possíveis erros
        await page.waitForTimeout(3000);
        
        // Verificar se não houve erros de JavaScript
        expect(consoleLogs.filter(log => log.includes('error') || log.includes('Error'))).toHaveLength(0);
        
        // Verificar se CroquiNFExporter foi inicializado com produtos individuais
        const croquiHasProdutos = await page.evaluate(() => {
            // Simular criação do exporter para verificar dados
            if (window.currentDI && window.currentCalculation) {
                try {
                    const exporter = new CroquiNFExporter(window.currentDI, window.currentCalculation);
                    return exporter.produtos && exporter.produtos.length > 0 && 
                           exporter.produtos[0].valor_icms > 0;
                } catch (e) {
                    console.error('Erro ao criar CroquiNFExporter:', e);
                    return false;
                }
            }
            return false;
        });
        
        expect(croquiHasProdutos).toBe(true);
        
        console.log('🎉 TESTE APROVADO: Croqui NF está recebendo valores ICMS/IPI por item corretos!');
    });
    
    test('Deve validar soma de impostos individuais = total DI', async ({ page }) => {
        // Navegar e processar DI
        await page.goto('http://localhost:8080/di-processing/di-processor.html');
        await page.waitForFunction(() => window.diProcessor && window.complianceCalculator);
        
        const xmlPath = path.join(__dirname, '../../orientacoes/2300120746.xml');
        await page.setInputFiles('#xmlFile', xmlPath);
        await page.click('button[onclick="processarDI()"]');
        await page.waitForSelector('#step2', { state: 'visible' });
        await page.click('button[onclick="calcularImpostos()"]');
        await page.waitForSelector('#step3', { state: 'visible' });
        
        // Verificar validação: soma individual = total DI
        const validacao = await page.evaluate(() => {
            const calc = window.currentCalculation;
            if (!calc || !calc.produtos_individuais) return { erro: 'Dados não encontrados' };
            
            // Somar impostos individuais
            const somaIndividual = {
                ii: calc.produtos_individuais.reduce((sum, p) => sum + (p.ii_item || 0), 0),
                ipi: calc.produtos_individuais.reduce((sum, p) => sum + (p.ipi_item || 0), 0),
                pis: calc.produtos_individuais.reduce((sum, p) => sum + (p.pis_item || 0), 0),
                cofins: calc.produtos_individuais.reduce((sum, p) => sum + (p.cofins_item || 0), 0),
                icms: calc.produtos_individuais.reduce((sum, p) => sum + (p.icms_item || 0), 0)
            };
            
            // Comparar com totais da DI
            const totaisDI = {
                ii: calc.impostos.ii.valor_devido,
                ipi: calc.impostos.ipi.valor_devido,
                pis: calc.impostos.pis.valor_devido,
                cofins: calc.impostos.cofins.valor_devido,
                icms: calc.impostos.icms.valor_devido
            };
            
            return { somaIndividual, totaisDI };
        });
        
        console.log('📊 Validação soma individual vs total DI:', validacao);
        
        // Tolerância de R$ 1,00 para diferenças de arredondamento com 189 produtos
        const tolerancia = 1.00;
        
        expect(Math.abs(validacao.somaIndividual.ii - validacao.totaisDI.ii)).toBeLessThan(tolerancia);
        expect(Math.abs(validacao.somaIndividual.ipi - validacao.totaisDI.ipi)).toBeLessThan(tolerancia);
        expect(Math.abs(validacao.somaIndividual.pis - validacao.totaisDI.pis)).toBeLessThan(tolerancia);
        expect(Math.abs(validacao.somaIndividual.cofins - validacao.totaisDI.cofins)).toBeLessThan(tolerancia);
        expect(Math.abs(validacao.somaIndividual.icms - validacao.totaisDI.icms)).toBeLessThan(tolerancia);
        
        console.log('✅ VALIDAÇÃO APROVADA: Soma individual = Total DI');
    });
});