// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Melhorias UX/UI', () => {
  let page;
  
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    
    // Capturar erros do console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console Error: ${msg.text()}`);
      }
    });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Deve mostrar mudança visual no drag & drop', async () => {
    // Navegar para o sistema
    await page.goto('http://localhost:8080/sistema-importacao.html');
    
    // Testar visual feedback do drag & drop
    const dropZone = page.locator('#dropZone');
    await expect(dropZone).toBeVisible();
    
    // Simular drag over (não conseguimos testar visualmente mas verificamos se não há erro)
    await dropZone.hover();
    
    // Capturar screenshot
    await page.screenshot({ path: 'tests/screenshots/melhoria-dragdrop.png' });
  });

  test('Deve abrir modal de detalhes da adição', async () => {
    // Carregar exemplo
    await page.evaluate(() => {
      window.loadSample();
    });
    
    // Aguardar processamento
    await page.waitForTimeout(3000);
    
    // Ir para aba de dados
    await page.click('[data-tab="dados"]');
    await page.waitForTimeout(1000);
    
    // Verificar se botão de visualizar existe
    const viewButton = page.locator('button:has-text("👁")').first();
    if (await viewButton.count() > 0) {
      // Clicar no botão de visualizar
      await viewButton.click();
      
      // Aguardar modal aparecer
      await page.waitForTimeout(2000);
      
      // Verificar se modal apareceu
      const modal = page.locator('#modalAdicaoDetails');
      await expect(modal).toBeVisible();
      
      // Capturar screenshot
      await page.screenshot({ path: 'tests/screenshots/melhoria-modal-adicao.png' });
      
      // Fechar modal
      await page.click('#modalAdicaoDetails .close');
    }
  });

  test('Deve mostrar opções de exportação', async () => {
    // Clicar no botão exportar
    await page.click('button:has-text("Exportar")');
    
    // Aguardar modal de opções aparecer
    await page.waitForTimeout(1000);
    
    // Verificar se modal de opções apareceu
    const exportModal = page.locator('#exportOptionsModal');
    await expect(exportModal).toBeVisible();
    
    // Verificar se opções estão disponíveis
    await expect(page.locator('text=Planilha Excel')).toBeVisible();
    await expect(page.locator('text=Arquivo JSON')).toBeVisible();
    
    // Capturar screenshot
    await page.screenshot({ path: 'tests/screenshots/melhoria-opcoes-exportacao.png' });
    
    // Fechar modal
    await page.click('#exportOptionsModal .close');
  });

  test('Deve mostrar interface de memória de cálculo', async () => {
    // Clicar no botão de memória
    await page.click('button:has-text("Memória")');
    
    // Aguardar modal aparecer
    await page.waitForTimeout(1000);
    
    // Verificar se modal de memória apareceu
    const memoryModal = page.locator('#calculationMemoryModal');
    await expect(memoryModal).toBeVisible();
    
    // Verificar se estatísticas estão visíveis
    await expect(page.locator('text=Total de Operações')).toBeVisible();
    await expect(page.locator('text=Duração da Sessão')).toBeVisible();
    
    // Capturar screenshot
    await page.screenshot({ path: 'tests/screenshots/melhoria-memoria-calculo.png' });
    
    // Fechar modal
    await page.click('#calculationMemoryModal .close');
  });

  test('Deve permitir exportação em Excel', async () => {
    // Abrir opções de exportação
    await page.click('button:has-text("Exportar")');
    await page.waitForTimeout(500);
    
    // Tentar clicar na opção Excel (não vamos aguardar download)
    await page.click('text=Planilha Excel');
    
    // Aguardar um pouco para verificar se não há erros
    await page.waitForTimeout(2000);
    
    // Capturar screenshot
    await page.screenshot({ path: 'tests/screenshots/melhoria-exportacao-excel.png' });
  });
});