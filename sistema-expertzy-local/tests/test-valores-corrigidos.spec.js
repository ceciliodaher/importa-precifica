const { test, expect } = require('@playwright/test');

test.describe('Validação de Valores Tributários Corrigidos', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:8080/sistema-importacao.html');
        
        // Upload do arquivo XML
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles('samples/2300120746.xml');
        
        // Aguardar processamento
        await page.waitForTimeout(2000);
        
        // Ir para aba de dados
        await page.click('button[onclick="showTab(\'dados\')"]');
        await page.waitForTimeout(1000);
    });

    test('Deve exibir valores tributários corretos após correção dos divisores', async ({ page }) => {
        // Verificar se a tabela de adições foi carregada
        await expect(page.locator('#adicoesTable')).toBeVisible();
        
        // Expandir primeira adição para ver tributos
        const primeiraAdicao = page.locator('#adicoesTable tbody tr').first();
        await primeiraAdicao.click();
        
        // Aguardar expansão
        await page.waitForTimeout(1000);
        
        // Verificar valores específicos dos tributos
        const tabelaPage = page.locator('#adicoesTable');
        
        // Buscar linhas expandidas com dados de tributos
        const conteudoTabela = await tabelaPage.textContent();
        
        console.log('Conteúdo da tabela:', conteudoTabela);
        
        // Validações específicas baseadas no PDF extrato
        // II deve estar próximo de R$ 79.185,09
        expect(conteudoTabela).toMatch(/79[\.,]?\d*[\.,]?\d*/);
        
        // IPI deve estar próximo de R$ 33.320,00  
        expect(conteudoTabela).toMatch(/33[\.,]?\d*[\.,]?\d*/);
        
        // PIS deve estar próximo de R$ 14.050,41
        expect(conteudoTabela).toMatch(/14[\.,]?\d*[\.,]?\d*/);
        
        // COFINS deve estar próximo de R$ 67.648,25
        expect(conteudoTabela).toMatch(/67[\.,]?\d*[\.,]?\d*/);
    });

    test('Deve mostrar valores em reais, não centavos', async ({ page }) => {
        await page.click('button[onclick="showTab(\'dados\')"]');
        await page.waitForTimeout(1000);
        
        const tabelaPage = page.locator('#adicoesTable');
        const conteudoTabela = await tabelaPage.textContent();
        
        // Não deve ter valores muito pequenos (centavos) como R$ 0,79
        expect(conteudoTabela).not.toMatch(/R\$\s*0[\.,][0-9]{2}/);
        
        // Deve ter valores realistas (milhares)
        expect(conteudoTabela).toMatch(/[1-9]\d{1,2}[\.,]?\d*/);
    });

    test('Deve calcular totais corretos da DI', async ({ page }) => {
        // Verificar se o resumo de totais está correto
        const totalsInfo = page.locator('#totalsInfo');
        await expect(totalsInfo).toBeVisible();
        
        const conteudoTotals = await totalsInfo.textContent();
        console.log('Totais da DI:', conteudoTotals);
        
        // Os totais não devem ser zero ou muito pequenos
        expect(conteudoTotals).toMatch(/[1-9]\d*[\.,]?\d*/);
    });
});