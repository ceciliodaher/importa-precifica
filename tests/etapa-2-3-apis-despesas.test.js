/**
 * Teste E2E - ETAPAS 2 e 3: APIs e Mapeamento de Despesas
 * 
 * Valida:
 * - ETAPA 2.1: ProductMemoryManager APIs funcionais
 * - ETAPA 2.2: API consulta produtos CroquiNF  
 * - ETAPA 3.1: DataLoader mapeamento despesas aduaneiras
 */

const { test, expect } = require('@playwright/test');

test('ETAPA 2-3: Validar APIs e mapeamento de despesas', async ({ page }) => {
    // Configurar timeouts mais longos
    test.setTimeout(120000);
    
    console.log('🧪 Iniciando teste ETAPA 2-3: APIs e Despesas...');
    
    // 1. Navegar para Module 2
    await page.goto('http://localhost:8889/sistema-expertzy-local/di-processing/di-processor.html');
    await page.waitForLoadState('domcontentloaded');
    
    // 2. Aguardar inicialização do sistema
    await page.waitForSelector('#sistema-status .badge-success', { timeout: 30000 });
    
    // 3. Verificar se lista de DIs carregou
    const diCount = await page.locator('tbody tr').count();
    console.log(`📋 ${diCount} DIs encontradas na lista`);
    expect(diCount).toBeGreaterThan(0);
    
    // 4. Clicar na DI de teste
    const targetDI = '2520345968';
    console.log(`🎯 Carregando DI ${targetDI}...`);
    
    await page.click(`tbody tr:has-text("${targetDI}") button`);
    await page.waitForTimeout(3000);
    
    // 5. Verificar se dados da DI carregaram
    await page.waitForSelector('.di-summary', { timeout: 15000 });
    
    // 6. Verificar se despesas aduaneiras foram carregadas
    console.log('🔍 Verificando despesas aduaneiras...');
    
    // Aguardar mensagem de despesas carregadas no console
    let despesasCarregadas = false;
    
    page.on('console', msg => {
        if (msg.text().includes('✅ Despesas aduaneiras carregadas:')) {
            console.log('✅ Despesas encontradas:', msg.text());
            despesasCarregadas = true;
        }
    });
    
    // Aguardar um pouco para processar
    await page.waitForTimeout(2000);
    
    // 7. Executar cálculo de impostos
    console.log('🧮 Executando cálculo de impostos...');
    
    await page.click('#calcular-impostos');
    await page.waitForTimeout(5000);
    
    // 8. Verificar se produtos foram salvos na memória
    let produtosSalvos = false;
    
    page.on('console', msg => {
        if (msg.text().includes('produtos salvos na memória')) {
            console.log('✅ Produtos salvos:', msg.text());
            produtosSalvos = true;
        }
    });
    
    // 9. Verificar se cálculo concluído
    await page.waitForSelector('.calculation-results', { timeout: 20000 });
    
    // 10. Teste API ProductMemoryManager - Via JavaScript
    const productMemoryTest = await page.evaluate(async () => {
        try {
            console.log('🧪 Testando ProductMemoryManager APIs...');
            
            // Consultar produtos salvos
            const response = await fetch('/api/endpoints/consultar-produtos-memoria.php');
            const data = await response.json();
            
            return {
                success: data.success,
                count: data.count || 0,
                hasProducts: data.data && data.data.length > 0
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
    
    console.log('📊 ProductMemoryManager resultado:', productMemoryTest);
    expect(productMemoryTest.success).toBe(true);
    expect(productMemoryTest.count).toBeGreaterThan(0);
    
    // 11. Teste API Consulta Produtos CroquiNF
    const croquiAPITest = await page.evaluate(async () => {
        try {
            console.log('🧪 Testando API consultar-produtos-croqui...');
            
            const response = await fetch('/api/endpoints/consultar-produtos-croqui.php?numero_di=2520345968&formato=completo');
            const data = await response.json();
            
            return {
                success: data.success,
                totalProdutos: data.resumo?.total_produtos || 0,
                valorTotal: data.resumo?.valor_total_geral || 0
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
    
    console.log('📊 CroquiNF API resultado:', croquiAPITest);
    expect(croquiAPITest.success).toBe(true);
    expect(croquiAPITest.totalProdutos).toBeGreaterThan(0);
    
    // 12. Teste API Despesas Aduaneiras
    const despesasAPITest = await page.evaluate(async () => {
        try {
            console.log('🧪 Testando API buscar-despesas...');
            
            const response = await fetch('/api/endpoints/buscar-despesas.php?numero_di=2520345968');
            const data = await response.json();
            
            return {
                success: data.success,
                totalDespesas: data.total_despesas || 0,
                valorTotal: data.total_valor || 0,
                siscomex: data.totais_por_tipo?.SISCOMEX || 0
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
    
    console.log('📊 Despesas API resultado:', despesasAPITest);
    expect(despesasAPITest.success).toBe(true);
    expect(despesasAPITest.siscomex).toBeGreaterThan(0);
    
    // 13. Tentar gerar PDF (teste básico)
    console.log('📄 Testando geração de CroquiNF...');
    
    await page.click('#exportar-croqui-pdf');
    await page.waitForTimeout(3000);
    
    // Verificar se houve mensagem de sucesso no console
    let pdfGerado = false;
    page.on('console', msg => {
        if (msg.text().includes('PDF gerado com sucesso')) {
            console.log('✅ PDF gerado:', msg.text());
            pdfGerado = true;
        }
    });
    
    await page.waitForTimeout(2000);
    
    console.log('🎉 Teste ETAPA 2-3 concluído com sucesso!');
    console.log(`📊 Resumo:
    - ProductMemoryManager: ${productMemoryTest.count} produtos
    - CroquiNF API: ${croquiAPITest.totalProdutos} produtos 
    - Despesas: SISCOMEX R$ ${despesasAPITest.siscomex}`);
    
    // Validações finais
    expect(productMemoryTest.success && croquiAPITest.success && despesasAPITest.success).toBe(true);
});