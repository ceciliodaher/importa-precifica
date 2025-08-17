# Product Requirements Document
## Sistema de Importação e Precificação Expertzy

---

### 1. Visão Geral do Produto

O Sistema de Importação e Precificação da Expertzy constitui uma solução web integrada para processamento de Declarações de Importação (DI) e cálculo de custos de mercadorias importadas. O sistema visa automatizar o processo de análise tributária e precificação, oferecendo suporte completo desde a importação do XML da DI até a definição de preços de venda para diferentes categorias de clientes.

A arquitetura proposta prioriza simplicidade e eficiência, considerando as limitações de infraestrutura disponível, especificamente o ambiente de hospedagem compartilhada em PHP. O sistema será desenvolvido com foco na usabilidade e precisão dos cálculos tributários, atendendo às necessidades específicas de consultores tributários e empresas importadoras.

### 2. Objetivos do Sistema

O sistema busca centralizar e automatizar os processos de análise de importação, eliminando a necessidade de planilhas manuais e reduzindo significativamente o tempo de processamento de informações. A solução deve proporcionar maior precisão nos cálculos tributários e facilitar a tomada de decisões estratégicas relacionadas à precificação de produtos importados.

A implementação visa atender especificamente às demandas de profissionais que lidam com complexidades tributárias de importação, oferecendo ferramentas robustas para análise de custos e definição de estratégias de preços adequadas aos diferentes regimes tributários brasileiros.

### 3. Funcionalidades Principais

#### 3.1 Módulo de Importação de DI

O módulo principal responsabiliza-se pela importação e processamento de arquivos XML de Declarações de Importação. O sistema deve realizar a leitura automatizada do XML, extraindo informações essenciais como dados das adições, produtos, classificação fiscal (NCM), pesos, quantidades e valores FOB.

O processamento inclui a validação da estrutura do XML, verificação de integridade dos dados e organização das informações em formato estruturado para posterior análise. O sistema deve suportar diferentes versões de layout de DI, garantindo compatibilidade com as variações encontradas na prática.

#### 3.2 Gestão de Despesas Extra-DI

Esta funcionalidade permite ao usuário incluir despesas adicionais não contempladas diretamente na DI, mas que compõem o custo final da mercadoria. O sistema deve solicitar informações sobre despesas como armazenagem, movimentação portuária, despesas bancárias e outros custos incorridos no processo de nacionalização.

A interface deve permitir a configuração de quais despesas serão incluídas na base de cálculo do ICMS, oferecendo flexibilidade para diferentes estratégias tributárias. O sistema deve manter histórico dessas configurações para facilitar operações futuras similares.

#### 3.3 Apresentação e Análise de Dados

O sistema apresenta os dados processados em formato de tabela expansível, organizando as informações por adição e item. A estrutura de apresentação inclui dados detalhados como NCM, pesos por adição e item, unidades de medida, quantidades por caixa, valores CFR unitários e totais, além de informações sobre incidência de capatazia.

A interface permite navegação intuitiva entre diferentes níveis de detalhamento, facilitando a análise granular dos custos e a identificação de oportunidades de otimização tributária.

#### 3.4 Cálculos Tributários Automatizados

O sistema executa automaticamente os cálculos de todos os tributos incidentes na importação, incluindo Imposto de Importação (II), Imposto sobre Produtos Industrializados (IPI), Programa de Integração Social (PIS), Contribuição para o Financiamento da Seguridade Social (COFINS) e Imposto sobre Circulação de Mercadorias e Serviços (ICMS).

Os cálculos consideram as diferentes alíquotas aplicáveis, regimes especiais, reduções de base de cálculo e eventuais direitos antidumping. O sistema deve manter base atualizada de alíquotas e permitir ajustes manuais quando necessário.

#### 3.5 Sistema de Precificação Avançado

O módulo de precificação oferece cálculo automatizado de preços de venda considerando diferentes perfis de clientes: consumidor final, revenda e indústria. O sistema contempla os diversos regimes tributários brasileiros, incluindo Lucro Real, Lucro Presumido e Simples Nacional.

A funcionalidade inclui análise específica para ICMS normal e substituição tributária, considerando os benefícios fiscais disponíveis nos estados de Goiás, Santa Catarina, Minas Gerais e Espírito Santo. O sistema deve permitir simulações de cenários e comparação de resultados.

#### 3.6 Exportação e Relatórios

O sistema disponibiliza funcionalidades de exportação em formatos Excel e PDF, permitindo a geração do espelho da DI e croqui da nota fiscal. Os relatórios devem manter formatação profissional consistente com o padrão Expertzy.

A exportação deve incluir todas as informações processadas, cálculos realizados e análises geradas, proporcionando documentação completa para fins de auditoria e apresentação a clientes.

### 4. Especificações Técnicas

#### 4.1 Arquitetura do Sistema

Considerando as limitações de infraestrutura, o sistema será desenvolvido utilizando arquitetura web simples baseada em PHP puro, sem frameworks complexos que possam comprometer a performance em ambiente compartilhado. A estrutura seguirá o padrão Model-View-Controller (MVC) simplificado, garantindo organização do código e facilidade de manutenção.

O sistema utilizará predominantemente armazenamento em arquivos para dados temporários e sessões, minimizando a dependência de banco de dados e reduzindo a complexidade de deployment em ambientes compartilhados.

#### 4.2 Tecnologias Utilizadas

**Backend:** PHP 7.4+ com suporte a XML parsing e manipulação de arrays multidimensionais para processamento dos dados da DI. Utilização de bibliotecas nativas para leitura de XML e geração de arquivos Excel.

**Frontend:** HTML5, CSS3 e JavaScript vanilla para interface responsiva e interativa. Implementação de componentes de tabela expansível utilizando técnicas de DOM manipulation sem dependência de frameworks externos.

**Armazenamento:** Sistema híbrido utilizando arquivos JSON para configurações e dados temporários, com opção de integração com banco de dados MySQL simples para empresas que desejarem persistência de dados históricos.

#### 4.3 Estrutura de Arquivos

O sistema será organizado em estrutura modular, facilitando manutenção e evolução. A organização contempla separação clara entre lógica de negócio, interface de usuário e recursos estáticos.

```
/sistema-importacao/
├── /core/
│   ├── /models/          # Classes para processamento de DI e cálculos
│   ├── /controllers/     # Controladores das funcionalidades
│   └── /services/        # Serviços de negócio e utilitários
├── /views/               # Templates e interfaces
├── /assets/              # CSS, JavaScript e imagens
├── /uploads/             # Diretório para XMLs importados
├── /exports/             # Arquivos gerados para download
├── /config/              # Configurações do sistema
└── index.php             # Ponto de entrada principal
```

### 5. Workflow Operacional

#### 5.1 Processo de Importação

O fluxo operacional inicia-se com o upload do arquivo XML da DI através de interface web segura. O sistema valida o arquivo, verifica sua estrutura e extrai automaticamente todas as informações relevantes. Após o processamento inicial, o usuário é direcionado para a tela de configuração de despesas extra-DI.

Na etapa de configuração, o sistema apresenta formulário intuitivo para inclusão de despesas adicionais, permitindo especificar valores, natureza da despesa e se deve compor a base de cálculo do ICMS. O usuário pode salvar configurações como templates para uso futuro.

#### 5.2 Análise e Cálculos

Concluída a configuração de despesas, o sistema executa automaticamente todos os cálculos tributários, apresentando resultados em interface tabular expansível. O usuário pode navegar entre diferentes níveis de detalhamento, analisar custos por item e verificar a composição dos valores.

O sistema oferece funcionalidades de simulação, permitindo alterações em parâmetros específicos e recálculo automático dos resultados. Esta funcionalidade é especialmente útil para análise de cenários e otimização tributária.

#### 5.3 Precificação e Finalização

Após validação dos cálculos de importação, o usuário acessa o módulo de precificação, onde define margens de lucro, regime tributário aplicável e tipo de cliente. O sistema calcula automaticamente os preços sugeridos, considerando todos os fatores tributários e comerciais configurados.

O processo finaliza com a geração de relatórios e exportação dos dados em formatos adequados para arquivo ou apresentação a clientes.

### 6. Interface de Usuário

#### 6.1 Design e Usabilidade

A interface seguirá os padrões visuais da Expertzy, priorizando clareza e funcionalidade. O design responsivo garantirá adequada visualização em diferentes dispositivos, mantendo foco na experiência desktop dada a natureza analítica do sistema.

A navegação será intuitiva, com breadcrumbs claros e indicadores de progresso nas operações de processamento. O sistema incluirá tooltips explicativos e help contextual para facilitar a utilização por usuários menos experientes.

#### 6.2 Componentes Principais

**Dashboard Principal:** Visão geral das DIs processadas recentemente, atalhos para funções principais e indicadores de status do sistema.

**Interface de Upload:** Área de drag-and-drop para XMLs com validação em tempo real e feedback visual do progresso de processamento.

**Tabela de Resultados:** Componente expansível com capacidade de drill-down nos dados, filtros dinâmicos e recursos de ordenação.

**Configurador de Despesas:** Formulário responsivo com validação de dados e capacidade de salvar templates personalizados.

**Módulo de Precificação:** Interface de simulação com sliders para margens, seletores de regime tributário e comparativos visuais de cenários.

### 7. Considerações de Segurança

#### 7.1 Proteção de Dados

O sistema implementará medidas de segurança adequadas ao ambiente de hospedagem compartilhada, incluindo validação rigorosa de uploads, sanitização de dados de entrada e proteção contra ataques comuns como XSS e SQL injection.

Os arquivos temporários serão automaticamente removidos após processamento, e dados sensíveis serão tratados com criptografia adequada quando necessário armazenamento temporário.

#### 7.2 Controle de Acesso

Sistema simples de autenticação baseado em sessões PHP, com diferentes níveis de acesso conforme perfil do usuário. Implementação de timeout automático e log de atividades críticas.

### 8. Implementação e Deploy

#### 8.1 Fases de Desenvolvimento

**Fase 1:** Desenvolvimento do módulo de importação e processamento de XML, incluindo validação e extração de dados básicos.

**Fase 2:** Implementação dos cálculos tributários e interface de apresentação de resultados.

**Fase 3:** Desenvolvimento do sistema de precificação e funcionalidades de simulação.

**Fase 4:** Implementação de exportação, relatórios e refinamentos de interface.

#### 8.2 Testes e Validação

Cada fase incluirá testes rigorosos com dados reais de DIs, validação de cálculos através de conferência manual e testes de usabilidade com usuários finais.

O sistema será testado em diferentes ambientes de hospedagem compartilhada para garantir compatibilidade e performance adequada.

### 9. Manutenção e Evolução

#### 9.1 Atualizações Tributárias

O sistema será estruturado para facilitar atualizações de alíquotas e regras tributárias, com arquivos de configuração separados e procedimentos documentados para modificações.

#### 9.2 Suporte e Documentação

Desenvolvimento de documentação técnica completa e manual do usuário, além de sistema de suporte integrado para resolução de dúvidas e problemas operacionais.

---

*© 2025 Expertzy Inteligência Tributária*