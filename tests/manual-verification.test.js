/**
 * Teste Manual de Verificação: Entender estrutura real das páginas
 * 
 * @version 1.0.0
 * @author Expertzy System
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8889';

test.describe('Verificação Manual do Sistema', () => {

  test('Investigar estrutura Dashboard Import', async ({ page }) => {
    console.log('🔍 Investigando estrutura do Dashboard...');
    
    await page.goto(`${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`);
    await page.waitForLoadState('networkidle');
    
    // Aguardar um pouco para elementos carregarem
    await page.waitForTimeout(5000);
    
    // Capturar estrutura da página
    const pageStructure = await page.evaluate(() => {
      const elements = {
        title: document.querySelector('h2')?.textContent?.trim(),
        statsElements: [],
        buttons: []
      };
      
      // Capturar estatísticas
      const statsHeaders = document.querySelectorAll('h6');
      statsHeaders.forEach(h6 => {
        const nextElement = h6.nextElementSibling;
        if (nextElement && nextElement.tagName === 'H3') {
          elements.statsElements.push({
            label: h6.textContent.trim(),
            value: nextElement.textContent.trim()
          });
        }
      });
      
      // Capturar botões
      const buttons = document.querySelectorAll('button');
      buttons.forEach(btn => {
        elements.buttons.push({
          text: btn.textContent.trim(),
          disabled: btn.disabled,
          classes: btn.className
        });
      });
      
      return elements;
    });
    
    console.log('📊 Estrutura encontrada:', JSON.stringify(pageStructure, null, 2));
    
    // Aguardar que estatísticas carreguem via API
    await page.waitForTimeout(3000);
    
    // Capturar estatísticas novamente após APIs
    const updatedStats = await page.evaluate(() => {
      const stats = [];
      const statsHeaders = document.querySelectorAll('h6');
      statsHeaders.forEach(h6 => {
        const nextElement = h6.nextElementSibling;
        if (nextElement && nextElement.tagName === 'H3') {
          stats.push({
            label: h6.textContent.trim(),
            value: nextElement.textContent.trim()
          });
        }
      });
      return stats;
    });
    
    console.log('📊 Estatísticas atualizadas:', JSON.stringify(updatedStats, null, 2));
  });

  test('Investigar estrutura Module 2', async ({ page }) => {
    console.log('🔍 Investigando estrutura do Module 2...');
    
    await page.goto(`${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`);
    await page.waitForLoadState('networkidle');
    
    // Aguardar carregamento completo
    await page.waitForTimeout(5000);
    
    const pageStructure = await page.evaluate(() => {
      return {
        title: document.querySelector('h1')?.textContent?.trim(),
        selects: Array.from(document.querySelectorAll('select')).map(sel => ({
          name: sel.name,
          id: sel.id,
          optionCount: sel.options.length,
          firstOption: sel.options[0]?.textContent?.trim()
        })),
        majorSections: Array.from(document.querySelectorAll('h2, h3, h4')).map(h => h.textContent?.trim()),
        errors: Array.from(document.querySelectorAll('.error, .alert-danger, .text-danger')).map(el => el.textContent?.trim()),
        warnings: Array.from(document.querySelectorAll('.warning, .alert-warning, .text-warning')).map(el => el.textContent?.trim())
      };
    });
    
    console.log('🖥️ Estrutura Module 2:', JSON.stringify(pageStructure, null, 2));
  });

  test('Testar API database-stats', async ({ page }) => {
    console.log('🔍 Testando API database-stats...');
    
    const response = await page.request.get(`${BASE_URL}/api/endpoints/database-stats.php`);
    console.log(`Status: ${response.status()}`);
    
    if (response.ok()) {
      const data = await response.json();
      console.log('📊 Resposta API:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ API falhou:', await response.text());
    }
  });

  test('Testar conectividade geral', async ({ page }) => {
    console.log('🔍 Testando conectividade geral...');
    
    const urls = [
      `${BASE_URL}/sistema-expertzy-local/xml-import/import-dashboard.html`,
      `${BASE_URL}/sistema-expertzy-local/di-processing/di-processor.html`,
      `${BASE_URL}/api/endpoints/database-stats.php`,
      `${BASE_URL}/api/endpoints/status.php`
    ];
    
    for (const url of urls) {
      try {
        const response = await page.request.get(url);
        console.log(`✅ ${url}: ${response.status()}`);
      } catch (error) {
        console.log(`❌ ${url}: ${error.message}`);
      }
    }
  });

});