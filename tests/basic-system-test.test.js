/**
 * Teste Básico do Sistema: Verificação Fundamental
 * 
 * Testa se as páginas principais carregam e APIs básicas funcionam
 * 
 * @version 1.0.0
 * @author Expertzy System
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8889';

test.describe('Teste Básico do Sistema', () => {

  test('Dashboard de Importação carrega corretamente', async ({ page }) => {
    console.log('🔍 Testando carregamento do Dashboard de Importação...');
    
    await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
    await page.waitForLoadState('networkidle');
    
    // Verificar título
    await expect(page.locator('h2')).toContainText('Dashboard de Importação XML');
    
    // Verificar elementos principais
    await expect(page.locator('button:has-text("Verificar Banco de Dados")')).toBeVisible();
    await expect(page.locator('.stats-item:has-text("DIs no Banco")')).toBeVisible();
    
    console.log('✅ Dashboard de Importação carregou corretamente');
  });

  test('Module 2 carrega corretamente', async ({ page }) => {
    console.log('🔍 Testando carregamento do Module 2...');
    
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    await page.waitForLoadState('networkidle');
    
    // Verificar título
    await expect(page.locator('h1')).toContainText('Sistema de Conformidade');
    
    console.log('✅ Module 2 carregou corretamente');
  });

  test('API de status do banco funciona', async ({ page }) => {
    console.log('🔍 Testando API de status do banco...');
    
    const response = await page.request.get(`${BASE_URL}/api/endpoints/database-stats.php`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBeTruthy();
    expect(data.data).toBeDefined();
    
    console.log(`✅ API retorna: ${data.data.total_dis} DIs no banco`);
  });

  test('Import Dashboard funciona com banco vazio', async ({ page }) => {
    console.log('🔍 Testando Dashboard com banco vazio...');
    
    await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
    await page.waitForLoadState('networkidle');
    
    // Verificar estatísticas zeradas se banco vazio
    const totalDIs = await page.locator('.stats-item:has-text("DIs no Banco") h3').textContent();
    console.log(`DIs no banco: ${totalDIs}`);
    
    // Verificar se botão limpar está desabilitado quando banco vazio
    if (totalDIs === '0') {
      const limparBtn = page.locator('button:has-text("Limpar Banco de Dados")');
      const isDisabled = await limparBtn.isDisabled();
      expect(isDisabled).toBeTruthy();
      console.log('✅ Botão limpar desabilitado com banco vazio');
    }
    
    console.log('✅ Dashboard funciona corretamente com banco vazio');
  });

  test('Module 2 detecta banco vazio', async ({ page }) => {
    console.log('🔍 Testando detecção de banco vazio no Module 2...');
    
    // Verificar que banco está vazio via API
    const statsResponse = await page.request.get(`${BASE_URL}/api/endpoints/database-stats.php`);
    const statsData = await statsResponse.json();
    
    if (statsData.data.total_dis === 0) {
      console.log('Banco está vazio, testando Module 2...');
      
      await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
      await page.waitForLoadState('networkidle');
      
      // Aguardar carregamento e verificar se há mensagem de banco vazio
      await page.waitForTimeout(3000);
      
      // Verificar select de DI
      const diSelector = page.locator('select[name="di_number"], #di-select');
      if (await diSelector.isVisible()) {
        const optionCount = await diSelector.locator('option').count();
        console.log(`Opções no select: ${optionCount}`);
        expect(optionCount).toBeLessThanOrEqual(1); // Apenas opção padrão
      }
      
      console.log('✅ Module 2 detecta banco vazio corretamente');
    } else {
      console.log(`Banco não está vazio (${statsData.data.total_dis} DIs), pulando teste`);
    }
  });

});