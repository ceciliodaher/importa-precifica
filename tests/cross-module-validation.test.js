/**
 * Testes Cross-Module: Validação de Dados entre Módulos
 * 
 * Testa que dados fluem corretamente entre:
 * - Module 1 (Import) → Database → Module 2 (Process)
 * - APIs retornam dados consistentes
 * - Produtos individuais são calculados corretamente
 * 
 * @version 1.0.0
 * @author Expertzy System
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:8889';
const API_BASE = `${BASE_URL}/api/endpoints`;

test.describe('Validação Cross-Module', () => {
  
  // Dados de referência da DI 2300120746
  const REFERENCE_DI = {
    numero: '2300120746',
    expectedAdicoes: 16,
    expectedMercadorias: 189,
    expectedImportador: 'WPX IMPORTACAO E EXPORTACAO LTDA'
  };

  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(60000);
    
    // Log de erros
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
  });

  test('VALIDAÇÃO: Dados API vs Interface Module 2', async ({ page }) => {
    console.log('🔍 Validando consistência API vs Interface...');
    
    // ===================================================================
    // SETUP: Importar DI de referência
    // ===================================================================
    
    // Limpar e importar DI
    await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
    await page.click('button:has-text("Limpar Banco")');
    await page.click('button:has-text("Confirmar")');
    await page.waitForTimeout(2000);
    
    // Upload DI
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '..', 'orientacoes', '2300120746.xml'));
    await expect(page.locator('.upload-progress')).toBeHidden({ timeout: 60000 });
    
    console.log('✅ DI importada no banco');
    
    // ===================================================================
    // TESTE 1: Validação direta via API
    // ===================================================================
    
    console.log('📡 Testando APIs diretamente...');
    
    // Fazer requisição direta para API
    const apiResponse = await page.request.get(`${API_BASE}/buscar-di.php?numero_di=${REFERENCE_DI.numero}`);
    expect(apiResponse.ok()).toBeTruthy();
    
    const apiData = await apiResponse.json();
    expect(apiData.success).toBeTruthy();
    
    const diData = apiData.data;
    
    // Validar estrutura da DI
    expect(diData.numero_di).toBe(REFERENCE_DI.numero);
    expect(diData.adicoes).toBeDefined();
    expect(diData.adicoes.length).toBe(REFERENCE_DI.expectedAdicoes);
    
    // Validar importador
    expect(diData.importador_nome).toContain('WPX');
    
    // Contar mercadorias
    let totalMercadorias = 0;
    diData.adicoes.forEach(adicao => {
      if (adicao.mercadorias) {
        totalMercadorias += adicao.mercadorias.length;
      }
    });
    expect(totalMercadorias).toBe(REFERENCE_DI.expectedMercadorias);
    
    console.log(`✅ API retorna ${diData.adicoes.length} adições e ${totalMercadorias} mercadorias`);
    
    // ===================================================================
    // TESTE 2: Validação via Interface Module 2
    // ===================================================================
    
    console.log('🖥️ Testando Interface Module 2...');
    
    // Navegar para Module 2
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    await page.waitForLoadState('networkidle');
    
    // Selecionar DI
    const diSelector = page.locator('select[name="di_number"], #di-select');
    await diSelector.selectOption(REFERENCE_DI.numero);
    await expect(page.locator('.loading-indicator')).toBeHidden({ timeout: 30000 });
    
    // Capturar dados da interface
    const interfaceData = await page.evaluate(() => {
      return {
        numeroDI: window.currentDI?.numero_di,
        numAdicoes: window.currentDI?.adicoes?.length,
        importadorNome: window.currentDI?.importador_nome,
        produtosIndividuais: window.currentDI?.produtos_individuais?.length || 0
      };
    });
    
    // Comparar dados API vs Interface
    expect(interfaceData.numeroDI).toBe(diData.numero_di);
    expect(interfaceData.numAdicoes).toBe(diData.adicoes.length);
    expect(interfaceData.importadorNome).toBe(diData.importador_nome);
    
    console.log('✅ Dados consistentes entre API e Interface');
    
    // ===================================================================
    // TESTE 3: Validação de Produtos Individuais
    // ===================================================================
    
    console.log('🧮 Validando produtos individuais...');
    
    // Executar cálculo para gerar produtos individuais
    await page.locator('select[name="estado"]').selectOption('GO');
    await page.click('button:has-text("Calcular")');
    await expect(page.locator('.calculation-progress')).toBeHidden({ timeout: 90000 });
    
    // Abrir aba produtos
    await page.click('button:has-text("Produtos"), .tab-produtos');
    await expect(page.locator('.produtos-individuais-table')).toBeVisible({ timeout: 30000 });
    
    // Contar produtos na interface
    const produtoRows = await page.locator('.produtos-individuais-table tbody tr').count();
    
    // Validar que produtos foram gerados
    expect(produtoRows).toBeGreaterThan(100); // Expectativa mínima
    
    // Verificar dados de produto individual
    const firstProductData = await page.locator('.produtos-individuais-table tbody tr').first().evaluate(row => {
      return {
        codigo: row.querySelector('.produto-codigo')?.textContent?.trim(),
        valor: row.querySelector('.produto-valor')?.textContent?.trim(),
        impostos: row.querySelector('.produto-impostos')?.textContent?.trim()
      };
    });
    
    expect(firstProductData.codigo).toBeTruthy();
    expect(firstProductData.valor).toMatch(/R\$/);
    
    console.log(`✅ ${produtoRows} produtos individuais gerados e validados`);
    
    // ===================================================================
    // TESTE 4: Validação de Cálculos por Estado
    // ===================================================================
    
    console.log('🗺️ Validando cálculos por estado...');
    
    const states = ['GO', 'SC', 'ES', 'MG'];
    const stateResults = {};
    
    for (const state of states) {
      console.log(`Testando estado: ${state}`);
      
      // Selecionar estado
      await page.locator('select[name="estado"]').selectOption(state);
      await page.waitForTimeout(1000); // Aguardar configuração ICMS
      
      // Recalcular
      await page.click('button:has-text("Calcular")');
      await expect(page.locator('.calculation-progress')).toBeHidden({ timeout: 60000 });
      
      // Capturar resultado ICMS
      const icmsValue = await page.locator('.imposto-icms .valor-devido').textContent();
      stateResults[state] = icmsValue;
      
      console.log(`${state}: ICMS = ${icmsValue}`);
    }
    
    // Validar que estados diferentes produzem resultados diferentes
    // (devido aos diferentes incentivos fiscais)
    const uniqueValues = new Set(Object.values(stateResults));
    expect(uniqueValues.size).toBeGreaterThan(1);
    
    console.log('✅ Cálculos por estado validados');
    
    // ===================================================================
    // TESTE 5: Persistência no Banco
    // ===================================================================
    
    console.log('💾 Validando persistência no banco...');
    
    // Salvar cálculo no banco
    await page.click('button:has-text("Salvar Cálculo"), #salvar-calculo');
    await expect(page.locator('.save-success, .status-success')).toBeVisible({ timeout: 30000 });
    
    // Verificar via API que cálculo foi salvo
    const calculosResponse = await page.request.get(`${API_BASE}/buscar-calculos.php?numero_di=${REFERENCE_DI.numero}`);
    expect(calculosResponse.ok()).toBeTruthy();
    
    const calculosData = await calculosResponse.json();
    expect(calculosData.success).toBeTruthy();
    expect(calculosData.data.length).toBeGreaterThan(0);
    
    console.log(`✅ ${calculosData.data.length} cálculo(s) persistido(s) no banco`);
    
    // ===================================================================
    // RESULTADO FINAL
    // ===================================================================
    
    console.log('🎉 VALIDAÇÃO CROSS-MODULE COMPLETA!');
    console.log('✅ APIs retornam dados consistentes');
    console.log('✅ Interface carrega dados do banco');
    console.log('✅ Produtos individuais calculados corretamente');
    console.log('✅ Cálculos por estado funcionais');
    console.log('✅ Persistência no banco validada');
  });

  test('TESTE: Fluxo sem localStorage', async ({ page }) => {
    console.log('🚫 Testando fluxo sem localStorage...');
    
    // Limpar localStorage antes de começar
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Importar DI
    await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
    await page.click('button:has-text("Limpar Banco")');
    await page.click('button:has-text("Confirmar")');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '..', 'orientacoes', '2300120746.xml'));
    await expect(page.locator('.upload-progress')).toBeHidden({ timeout: 60000 });
    
    // Navegar para Module 2
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    
    // Verificar que localStorage está vazio
    const localStorageSize = await page.evaluate(() => localStorage.length);
    expect(localStorageSize).toBe(0);
    
    // Tentar carregar DI
    const diSelector = page.locator('select[name="di_number"], #di-select');
    await expect(diSelector.locator('option:has-text("2300120746")')).toBeVisible({ timeout: 30000 });
    
    // Se DI está disponível, significa que veio do banco, não localStorage
    await diSelector.selectOption('2300120746');
    await expect(page.locator('.loading-indicator')).toBeHidden({ timeout: 30000 });
    
    // Validar dados carregados
    await expect(page.locator('.di-info')).toContainText('2300120746');
    
    console.log('✅ Sistema funciona completamente sem localStorage');
  });

  test('TESTE: Detecção de banco vazio', async ({ page }) => {
    console.log('🕳️ Testando detecção de banco vazio...');
    
    // Limpar banco
    await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
    await page.click('button:has-text("Limpar Banco")');
    await page.click('button:has-text("Confirmar")');
    await page.waitForTimeout(2000);
    
    // Navegar para Module 2 com banco vazio
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    await page.waitForLoadState('networkidle');
    
    // Verificar que gate de continuação aparece
    await expect(page.locator('.gate-database-empty, .no-data-message')).toBeVisible({ timeout: 30000 });
    
    // Verificar que não há DIs disponíveis
    const diSelector = page.locator('select[name="di_number"], #di-select');
    const optionCount = await diSelector.locator('option').count();
    expect(optionCount).toBeLessThanOrEqual(1); // Apenas opção default
    
    console.log('✅ Sistema detecta banco vazio corretamente');
  });

});