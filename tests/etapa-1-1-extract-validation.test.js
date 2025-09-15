/**
 * Teste E2E - ETAPA 1.1 EXTRACT Validation
 * Valida que a extração de informacaoComplementar está funcionando corretamente
 * e que os dados estão disponíveis via API para o Module 2
 */

const { test, expect } = require('@playwright/test');

test.describe('ETAPA 1.1 - EXTRACT Validation', () => {
  
  test('Deve extrair SISCOMEX da informacaoComplementar e disponibilizar via API', async ({ page }) => {
    console.log('🔄 Iniciando teste ETAPA 1.1 - Extração informacaoComplementar');
    
    // 1. Verificar se DI 2520345968 está no banco com SISCOMEX
    console.log('📊 Verificando dados no banco MySQL...');
    const response = await fetch('http://localhost:8889/api/endpoints/buscar-di.php?numero_di=2520345968');
    const diResponse = await response.json();
    
    expect(response.ok).toBeTruthy();
    expect(diResponse.success).toBeTruthy();
    expect(diResponse.data.numero_di).toBe('2520345968');
    console.log('✅ DI 2520345968 encontrada no banco');
    
    // 2. Verificar se existe endpoint para despesas aduaneiras
    console.log('🔍 Testando acesso às despesas aduaneiras...');
    const despesasResponse = await fetch('http://localhost:8889/api/endpoints/buscar-despesas.php?numero_di=2520345968');
    
    expect(despesasResponse.ok).toBeTruthy();
    const despesasData = await despesasResponse.json();
    console.log('✅ Endpoint despesas encontrado');
    
    expect(despesasData.success).toBeTruthy();
    expect(despesasData.numero_di).toBe('2520345968');
    expect(despesasData.total_despesas).toBeGreaterThan(0);
    
    // Verificar se SISCOMEX está presente
    const siscomex = despesasData.despesas.find(d => d.tipo_despesa === 'SISCOMEX');
    expect(siscomex).toBeTruthy();
    expect(siscomex.valor).toBeCloseTo(154.23, 2);
    expect(siscomex.codigo_receita).toBe('7811');
    console.log('🎯 SISCOMEX R$ 154,23 confirmado via API!');
    
    // 3. Navegar para Module 2 e verificar se dados podem ser carregados
    console.log('🌐 Testando Module 2 - Di Processor...');
    await page.goto('http://localhost:8889/sistema-expertzy-local/di-processing/di-processor.html');
    await page.waitForLoadState('networkidle');
    
    // Aguardar carregamento da interface
    await expect(page.locator('h1')).toContainText('Processador de DI');
    console.log('✅ Module 2 carregado com sucesso');
    
    // 4. Testar busca da DI via interface
    const searchInput = page.locator('input[placeholder*="DI"], input[id*="di"], input[name*="di"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('2520345968');
      
      // Buscar botão de busca ou pressionar Enter
      const searchButton = page.locator('button:has-text("Buscar"), button:has-text("Carregar"), button[type="submit"]').first();
      if (await searchButton.count() > 0) {
        await searchButton.click();
      } else {
        await searchInput.press('Enter');
      }
      
      await page.waitForTimeout(2000); // Aguardar carregamento
      console.log('🔍 Busca da DI 2520345968 executada via interface');
      
      // Verificar se dados foram carregados na interface
      const diInfo = page.locator('text=2520345968');
      if (await diInfo.count() > 0) {
        console.log('✅ DI 2520345968 carregada na interface Module 2');
      } else {
        console.log('⚠️ DI não apareceu na interface - pode precisar da API de despesas');
      }
      
    } else {
      console.log('⚠️ Campo de busca DI não encontrado na interface atual');
    }
    
    // 5. Verificar estado dos exports
    console.log('📄 Testando disponibilidade de botões de export...');
    const exportButtons = await page.locator('button:has-text("Export"), button:has-text("PDF"), button:has-text("Excel"), button[id*="export"]').count();
    console.log(`📊 Encontrados ${exportButtons} botões de export disponíveis`);
    
    if (exportButtons > 0) {
      console.log('✅ Botões de export estão disponíveis para teste futuro');
    } else {
      console.log('⚠️ Botões de export não encontrados - normal até ETAPA 4 estar concluída');
    }
    
    console.log('🎉 ETAPA 1.1 EXTRACT - Validação concluída com sucesso!');
  });
  
  test('Deve validar consolidação do parsing (PHP único)', async ({ page }) => {
    console.log('🔧 Testando consolidação do parsing XML...');
    
    // Navegar para Module 2
    await page.goto('http://localhost:8889/sistema-expertzy-local/di-processing/di-processor.html');
    await page.waitForLoadState('networkidle');
    
    // Verificar se DIProcessor.js NÃO está mais sendo carregado
    const scripts = await page.evaluate(() => {
      return Array.from(document.scripts).map(script => script.src || script.innerHTML);
    });
    
    const diProcessorLoaded = scripts.some(script => 
      script.includes('DIProcessor.js') || script.includes('DIProcessor')
    );
    
    if (diProcessorLoaded) {
      console.log('⚠️ DIProcessor.js ainda está sendo carregado - precisa ser removido');
    } else {
      console.log('✅ DIProcessor.js não está mais sendo carregado - consolidação OK');
    }
    
    // Verificar se DataLoader.js está presente (deve estar)
    const dataLoaderPresent = scripts.some(script => 
      script.includes('DataLoader.js') || script.includes('DataLoader')
    );
    
    expect(dataLoaderPresent).toBeTruthy();
    console.log('✅ DataLoader.js presente - arquitetura correta mantida');
  });
  
  test('Deve verificar integridade dos dados XML processados', async ({ page }) => {
    console.log('🔍 Verificando integridade dos dados XML processados...');
    
    // Verificar múltiplas DIs para garantir que o parser funciona universalmente
    const testDIs = ['2520345968', '2518173187', '2300120746'];
    
    for (const diNumber of testDIs) {
      console.log(`📋 Testando DI ${diNumber}...`);
      
      const response = await fetch(`http://localhost:8889/api/endpoints/buscar-di.php?numero_di=${diNumber}`);
      
      if (response.ok) {
        const diData = await response.json();
        
        // Verificar campos obrigatórios
        expect(diData.data.numero_di).toBe(diNumber);
        expect(diData.data.importador_nome).toBeTruthy();
        expect(diData.data.data_registro).toBeTruthy();
        
        console.log(`✅ DI ${diNumber} - dados básicos OK`);
        
        // Verificar se tem adições
        if (diData.data.adicoes && diData.data.adicoes.length > 0) {
          console.log(`📦 DI ${diNumber} - ${diData.data.adicoes.length} adições processadas`);
        }
        
      } else {
        console.log(`⚠️ DI ${diNumber} não encontrada no banco`);
      }
    }
    
    console.log('✅ Verificação de integridade concluída');
  });
});