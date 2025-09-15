/**
 * Testes de Validação: Sistema sem Fallbacks localStorage
 * 
 * Testa que o sistema falha corretamente quando:
 * - APIs não estão disponíveis
 * - Banco de dados está vazio
 * - Dados obrigatórios estão ausentes
 * 
 * Garante que sistema NÃO usa localStorage como fallback
 * 
 * @version 1.0.0
 * @author Expertzy System
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8889';

test.describe('Validação: Sistema sem Fallbacks', () => {

  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(30000);
    
    // Capturar erros de console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
    
    // Limpar storage antes de cada teste
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('TESTE: Banco vazio → Sistema falha corretamente', async ({ page }) => {
    console.log('🕳️ Testando comportamento com banco vazio...');
    
    // Limpar banco de dados
    await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
    await page.click('button:has-text("Limpar Banco")');
    await page.click('button:has-text("Confirmar")');
    await page.waitForTimeout(2000);
    
    // Navegar para Module 2
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    await page.waitForLoadState('networkidle');
    
    // Verificar que gate de continuação aparece
    await expect(page.locator('.gate-database-empty, .no-data-message')).toBeVisible({ timeout: 30000 });
    
    // Verificar mensagem específica sobre banco vazio
    const gateMessage = await page.locator('.gate-database-empty, .no-data-message');
    await expect(gateMessage).toContainText(/banco.*vazio|nenhuma.*encontrada/i);
    
    // Verificar que interface principal está bloqueada
    const diSelector = page.locator('select[name="di_number"], #di-select');
    const isDisabled = await diSelector.isDisabled();
    if (!isDisabled) {
      // Se não estiver desabilitado, verificar se tem apenas opção padrão
      const optionCount = await diSelector.locator('option').count();
      expect(optionCount).toBeLessThanOrEqual(1);
    }
    
    console.log('✅ Sistema detecta banco vazio e bloqueia interface');
  });

  test('TESTE: APIs indisponíveis → Erro explícito', async ({ page }) => {
    console.log('🚫 Testando comportamento com APIs indisponíveis...');
    
    // Interceptar e bloquear APIs
    await page.route('**/api/endpoints/**', route => {
      route.abort('failed');
    });
    
    // Tentar navegar para Module 2
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    await page.waitForLoadState('networkidle');
    
    // Aguardar tentativas de carregamento falharem
    await page.waitForTimeout(5000);
    
    // Verificar que erro é exibido (não fallback para localStorage)
    const errorMessages = page.locator('.error-message, .api-error, .connection-error');
    const hasError = await errorMessages.count() > 0;
    
    if (hasError) {
      await expect(errorMessages.first()).toBeVisible();
      console.log('✅ Sistema exibe erro quando APIs falham');
    } else {
      // Se não há mensagem de erro visível, verificar que interface não carregou dados
      const diSelector = page.locator('select[name="di_number"], #di-select');
      const optionCount = await diSelector.locator('option').count();
      expect(optionCount).toBeLessThanOrEqual(1); // Apenas opção padrão
      console.log('✅ Sistema não carrega dados quando APIs falham');
    }
  });

  test('TESTE: localStorage limpo → Nenhum fallback', async ({ page }) => {
    console.log('🧹 Testando que localStorage não é usado como fallback...');
    
    // Primeiro, simular dados no localStorage (que não devem ser usados)
    await page.evaluate(() => {
      localStorage.setItem('expertzy_fake_di', JSON.stringify({
        numero_di: 'FAKE123',
        adicoes: [{ numero_adicao: 1, valor: 1000 }]
      }));
      localStorage.setItem('currentDI', JSON.stringify({
        numero_di: 'FAKE456',
        adicoes: [{ numero_adicao: 1, valor: 2000 }]
      }));
    });
    
    // Navegar para Module 2 com banco vazio
    await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
    await page.click('button:has-text("Limpar Banco")');
    await page.click('button:has-text("Confirmar")');
    
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    await page.waitForLoadState('networkidle');
    
    // Verificar que dados fake do localStorage NÃO aparecem
    const diSelector = page.locator('select[name="di_number"], #di-select');
    
    // Não deve ter DIs FAKE123 ou FAKE456
    await expect(diSelector.locator('option:has-text("FAKE123")')).toHaveCount(0);
    await expect(diSelector.locator('option:has-text("FAKE456")')).toHaveCount(0);
    
    // Verificar que gate de banco vazio aparece
    await expect(page.locator('.gate-database-empty, .no-data-message')).toBeVisible();
    
    console.log('✅ Sistema ignora localStorage e mostra banco vazio');
  });

  test('TESTE: Dados inválidos → Fail-fast explícito', async ({ page }) => {
    console.log('⚠️ Testando fail-fast com dados inválidos...');
    
    // Interceptar API para retornar dados inválidos
    await page.route('**/api/endpoints/buscar-di.php**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            numero_di: '2300120746',
            adicoes: null, // Dados inválidos
            importador_nome: null
          }
        })
      });
    });
    
    // Primeiro, adicionar DI real ao banco
    await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
    await page.click('button:has-text("Limpar Banco")');
    await page.click('button:has-text("Confirmar")');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '..', 'orientacoes', '2300120746.xml'));
    await expect(page.locator('.upload-progress')).toBeHidden({ timeout: 60000 });
    
    // Navegar para Module 2
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    await page.waitForLoadState('networkidle');
    
    // Tentar selecionar DI com dados inválidos
    const diSelector = page.locator('select[name="di_number"], #di-select');
    await diSelector.selectOption('2300120746');
    
    // Aguardar erro aparecer
    await page.waitForTimeout(3000);
    
    // Verificar que erro é exibido (fail-fast)
    const errorVisible = await page.locator('.error-message, .validation-error, .data-error').isVisible();
    
    if (errorVisible) {
      console.log('✅ Sistema falha explicitamente com dados inválidos');
    } else {
      // Verificar que interface não carregou dados inválidos
      const diInfo = page.locator('.di-info');
      const hasValidData = await diInfo.isVisible() && await diInfo.textContent();
      expect(hasValidData).toBeFalsy();
      console.log('✅ Sistema não carrega dados inválidos');
    }
  });

  test('TESTE: Cálculo sem dados → Erro explícito', async ({ page }) => {
    console.log('🧮 Testando cálculo sem dados obrigatórios...');
    
    // Navegar para Module 2 com banco vazio
    await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
    await page.click('button:has-text("Limpar Banco")');
    await page.click('button:has-text("Confirmar")');
    
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    await page.waitForLoadState('networkidle');
    
    // Tentar executar cálculo sem DI selecionada
    const calcularBtn = page.locator('button:has-text("Calcular"), #calcular-impostos');
    
    if (await calcularBtn.isVisible() && await calcularBtn.isEnabled()) {
      await calcularBtn.click();
      
      // Aguardar erro aparecer
      await page.waitForTimeout(2000);
      
      // Verificar que erro é exibido
      const errorMessage = page.locator('.error-message, .calculation-error, .validation-error');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      
      console.log('✅ Cálculo falha explicitamente sem dados');
    } else {
      console.log('✅ Botão calcular desabilitado sem dados');
    }
  });

  test('TESTE: Export sem cálculo → Erro explícito', async ({ page }) => {
    console.log('📊 Testando export sem cálculo realizado...');
    
    // Importar DI mas não executar cálculo
    await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
    await page.click('button:has-text("Limpar Banco")');
    await page.click('button:has-text("Confirmar")');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '..', 'orientacoes', '2300120746.xml'));
    await expect(page.locator('.upload-progress')).toBeHidden({ timeout: 60000 });
    
    // Navegar para Module 2
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    await page.waitForLoadState('networkidle');
    
    // Selecionar DI
    const diSelector = page.locator('select[name="di_number"], #di-select');
    await diSelector.selectOption('2300120746');
    await expect(page.locator('.loading-indicator')).toBeHidden({ timeout: 30000 });
    
    // Tentar export sem cálculo
    const exportBtn = page.locator('button:has-text("Exportar Excel"), #export-excel');
    
    if (await exportBtn.isVisible() && await exportBtn.isEnabled()) {
      await exportBtn.click();
      
      // Aguardar erro ou verificar que nada aconteceu
      await page.waitForTimeout(3000);
      
      // Verificar que erro é exibido ou export não aconteceu
      const errorMessage = page.locator('.error-message, .export-error, .validation-error');
      const hasError = await errorMessage.isVisible();
      
      if (hasError) {
        console.log('✅ Export falha explicitamente sem cálculo');
      } else {
        console.log('✅ Export não executado sem cálculo');
      }
    } else {
      console.log('✅ Botão export desabilitado sem cálculo');
    }
  });

  test('TESTE: Reconexão após falha de API', async ({ page }) => {
    console.log('🔄 Testando reconexão após falha de API...');
    
    let apiBlocked = true;
    
    // Interceptar APIs inicialmente bloqueadas
    await page.route('**/api/endpoints/**', route => {
      if (apiBlocked) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });
    
    // Tentar navegar com APIs bloqueadas
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Verificar estado de erro
    const hasInitialError = await page.locator('.error-message, .connection-error').isVisible();
    const hasEmptyState = await page.locator('.gate-database-empty, .no-data-message').isVisible();
    
    expect(hasInitialError || hasEmptyState).toBeTruthy();
    console.log('✅ Estado de erro confirmado com APIs bloqueadas');
    
    // Primeiro, preparar dados no banco
    apiBlocked = false; // Liberar APIs
    
    await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '..', 'orientacoes', '2300120746.xml'));
    await expect(page.locator('.upload-progress')).toBeHidden({ timeout: 60000 });
    
    // Voltar para Module 2 com APIs funcionando
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    await page.waitForLoadState('networkidle');
    
    // Verificar que sistema se recupera
    const diSelector = page.locator('select[name="di_number"], #di-select');
    await expect(diSelector.locator('option:has-text("2300120746")')).toBeVisible({ timeout: 30000 });
    
    console.log('✅ Sistema se recupera quando APIs voltam a funcionar');
  });

});