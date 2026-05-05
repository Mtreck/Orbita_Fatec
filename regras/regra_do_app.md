# Regra do App — Órbita FATEC

## 1. Visão geral
O Órbita FATEC é um ecossistema de gestão institucional desenvolvido para a FATEC. O objetivo do sistema é centralizar o controle de ativos (empréstimos de equipamentos), gestão de usuários e permissões, ensalamento de salas de aula e controle de carga horária para eventos do RH. O sistema utiliza uma arquitetura baseada em módulos independentes que compartilham uma identidade visual e um núcleo de autenticação/autorização centralizado.

## 2. Estrutura de pastas
- `/` (Raiz): Contém o Hub principal (`index.html`), arquivos de configuração do Firebase, e o núcleo do layout compartilhado.
  - `layout.js` / `layout.css`: Geradores dinâmicos da interface global (Sidebar e Header).
  - `permissions.js`: Definição estática de módulos e cargos iniciais.
  - `firebase-config.js`: Credenciais de conexão com o Firebase.
  - `login.html` / `login.js`: Portal de acesso e autenticação.
- `/emprestimo`: Módulo de gestão de empréstimos de notebooks e equipamentos de T.I.
- `/usuarios`: Módulo de administração de usuários e configuração global de permissões (RBAC).
- `/ensalamento`: Módulo de visualização e gestão de ocupação de salas e laboratórios.
- `/rh/carga-horaria`: Módulo de controle de ponto e horas excedentes para eventos.
- `/img`: Ativos de imagem e logotipos.
- `/regras`: Documentação técnica e logs de alteração (Este diretório).

## 3. Fluxo de autenticação
1. **Entrada**: O usuário acessa a raiz. Se não houver sessão ativa (verificado via `onAuthStateChanged`), é redirecionado para `login.html`.
2. **Login**: Realizado via Firebase Auth (E-mail/Senha).
3. **Sessão**: Após o login, o sistema busca o documento do usuário na coleção `users` do Firestore para identificar seu cargo (`role`).
4. **Comunicação**: Todos os e-mails transacionais são configurados para `pt-br`. O link de redefinição aponta para uma página customizada (`/redefinir-senha.html`).
5. **Proteção de Tela**: Cada módulo utiliza um `auth-guard`.
5. **Logout**: O botão de sair (no Header injetado pelo `layout.js`) limpa a sessão no Firebase e redireciona para a tela de login.

## 4. Cargos e permissões
O sistema utiliza Role-Based Access Control (RBAC). Os cargos base definidos em `permissions.js` são:

- **ADM N1 (Super Admin)**: Acesso total a todos os módulos e configurações do sistema.
- **ADM N2 (Setor/Chefia)**: Acesso gerencial a Empréstimos, Usuários, Ensalamento e Carga Horária (com restrições dependendo da configuração global).
- **TI (Suporte)**: Foco em Empréstimos, Usuários (gestão técnica) e Ensalamento.
- **RH (Recursos Humanos)**: Acesso exclusivo ao Dashboard e Carga Horária.
- **Visitante**: Acesso apenas para consulta ao Dashboard (módulos básicos liberados).

*Nota: No módulo de Usuários, o ADM N1 pode ajustar granularmente as permissões de "Ver" e "Executar" para cada cargo nos diferentes módulos.*

## 5. Módulos do sistema

### Meu Espaço (Antigo Dashboard)
- **Caminho**: `/meu-espaco/index.html`, `meu-espaco.js`, `meu-espaco.css`
- **Finalidade**: Área personalizada de produtividade do usuário com notas pessoais, avisos institucionais e widgets contextuais.
- **Principais funções**: `setupNotes()` (CRUD de post-its), `setupNotices()` (avisos ADM N1), `renderWidgets()` (baseado em RBAC).
- **Dependências**: Firestore (coleções `users/{uid}/notes` e `institutionalNotices`).

### Empréstimos
- **Caminho**: `/emprestimo/index.html`, `/emprestimo/app.js`, `/emprestimo/emprestimo.css`
- **Finalidade**: Controle de retirada e devolução de equipamentos.
- **Principais funções**: Leitura de QR Code, filtros de status (Cedido, Disponível).
- **Dependências**: Firestore (coleção `items`).

### Usuários
- **Caminho**: `/usuarios/index.html`, `/usuarios/app.js`, `/usuarios/usuarios.css`
- **Finalidade**: Gestão de contas de acesso e configuração de permissões globais por cargo.
- **Principais funções**: `renderUsers()`, `setupMainTabs()`, `saveGlobalPermissions()`.
- **Dependências**: Firebase Auth (criação de contas via secondary app), Firestore (coleções `users` e `config/permissions`).

### Ensalamento
- **Caminho**: `/ensalamento/index.html`, `/ensalamento/ensalamento.js`, `/ensalamento/simulation-engine.js`, `/ensalamento/ensalamento.css`
- **Finalidade**: Gestão inteligente de ocupação de salas e laboratórios com motor de simulação.
- **Padrão Institucional**: 3 dias presenciais, 2 dias EAD/Carga Protegida. Sábados proibidos.
- **Principais funções**: `SimulationEngine` (motor heurístico), `renderBottlenecks()` (análise de capacidade), `generateSuggestions()` (ranqueamento inteligente).
- **Dependências**: Firestore (coleções `rooms`, `classes`, `calendarEntries`, `simulations`).

### Carga Horária
- **Caminho**: `/rh/carga-horaria/index.html`, `/rh/carga-horaria/carga-horaria.js`, `/rh/carga-horaria/carga-horaria.css`
- **Finalidade**: Registro de entrada/saída em eventos e cálculo de horas trabalhadas.
- **Principais funções**: Registro de timestamps, exportação de histórico.
- **Dependências**: Firestore (coleção `carga_horaria`).

## 6. Padrão visual
O sistema segue uma identidade visual institucional "Light Theme" moderna:
- **Cores Principais**:
  - Azul Marinho (`#031426`): Sidebar.
  - Azul Primário (`#0F4EB8`): Botões e destaques.
  - Laranja (`#F97316` / `#EB7025`): Acentos e alertas.
  - Fundo (`#F4F7FB`): Cor de fundo das páginas.
- **Componentes Globais**:
  - **Sidebar**: Itens principais (como Meu Espaço) ficam no topo. Outros módulos são organizados por categorias retráteis (Accordion) que iniciam recolhidas.
  - **Header**: Título do módulo, nível de acesso, avatar e botão de logout.
  - **Cards**: Fundo branco, bordas suaves (`12px` a `22px`), sombras sutis.
  - **Classes Globais**: `.btn-primary`, `.layout-wrapper`, `.layout-main`, `.layout-content`, `.layout-nav-category`.

## 7. Regras de alteração
Sempre que um arquivo for criado, alterado ou removido, registrar aqui seguindo o modelo abaixo:

### [AAAA-MM-DD] Título da alteração
- Autor:
- Branch:
- Arquivos alterados:
- Tipo:
- Motivo:
- Impacto:
- Como testar:
- Como reverter:

## 8. Histórico de alterações

### [2026-05-04] Criação da documentação de regras do app
- Autor: Antigravity
- Branch: main (standard update)
- Arquivos alterados:
  - `/regras/regra_do_app.md`
- Tipo: criação
- Motivo: criar documentação técnica e registro de alterações do sistema para melhorar a manutenção e padronização.
- Impacto: Facilita a entrada de novos desenvolvedores e o controle de mudanças futuras.
- Como testar: Verificar a existência do arquivo na pasta `/regras` e validar a integridade dos links técnicos citados.
- Como reverter: Remover o diretório `/regras`.

### [2026-05-04] Criação do Meu Espaço
- Autor: Antigravity
- Branch: main (refactor)
- Arquivos criados:
  - `/meu-espaco/index.html`
  - `/meu-espaco/meu-espaco.css`
  - `/meu-espaco/meu-espaco.js`
- Arquivos alterados:
  - `index.html` (adicionado redirecionamento)
  - `login.js` (redirecionamento após login)
  - `permissions.js` (renomeado Dashboard para Meu Espaço)
  - `regras/regra_do_app.md` (documentação)
- Tipo: criação/alteração
- Motivo: substituir dashboard genérico por área personalizada do usuário focada em produtividade e avisos.
- Impacto: Melhora a utilidade da tela inicial e centraliza avisos institucionais de forma controlada.
- Como testar:
  - Logar no sistema e verificar se é levado para `/meu-espaco/index.html`.
  - Criar, editar e fixar uma nota pessoal no Quadro do Funcionário.
  - Logar como ADM N1 e criar um aviso no Quadro de Avisos.
  - Verificar se widgets de módulos aparecem corretamente conforme o cargo.
- Como reverter:
  - Restaurar redirecionamento no `login.js` e `index.html` para o hub original.
  - Reverter alterações de nome no `permissions.js`.

### [2026-05-05] Redesign Premium e Motor de Simulação (Ensalamento)
- Autor: Antigravity
- Branch: main (refactor/feature)
- Arquivos criados:
  - `/ensalamento/simulation-engine.js` (Lógica Heurística)
- Arquivos alterados:
  - `/ensalamento/index.html` (Layout 2 colunas)
  - `/ensalamento/ensalamento.js` (Integração com Motor)
  - `/ensalamento/ensalamento.css` (Premium Light Theme)
  - `regras/regra_do_app.md` (Documentação)
- Tipo: Refatoração de UI/UX e implementação de Inteligência de Dados.
- Motivo: Transformar o mapa de ocupação em uma ferramenta de decisão ativa que respeita as regras da faculdade (3+2, proibição de sábados).
- Impacto: Redução drástica no tempo de planejamento de aulas e eliminação de conflitos manuais de salas.
- Como testar:
  - Acessar o módulo de Ensalamento.
  - Abrir o "Simulador de Encaixe de Aulas".
  - Usar o botão "Padrão Institucional (3+2)" e verificar se a I.A. sugere grades válidas (Score Ideal).
  - Validar se o botão de fechar (X) está visível e vermelho.
- Como reverter:
  - Restaurar backups de `ensalamento.js` e `ensalamento.css` anteriores ao redesign dark-to-light.

### [2026-05-05] Categorização da Sidebar e Organização Administrativa
- Autor: Antigravity
- Branch: main (UI/UX enhancement)
- Arquivos alterados:
  - `permissions.js` (Definição de `CATEGORIES` e agrupamento de Usuários/Ensalamento)
  - `layout.js` (Lógica de agrupamento)
  - `layout.css` (Estilo `.layout-nav-category`)
  - `regras/regra_do_app.md` (Documentação)
- Tipo: Refatoração de Interface para Escala.
- Motivo: Agrupar funções correlatas sob o setor "Administrativo" e simplificar o menu lateral.
- Impacto: Menu mais enxuto e intuitivo para os administradores do sistema.
- Como testar:
  - Logar com diferentes cargos (ex: RH vs T.I.).
  - Verificar se os itens estão agrupados sob títulos como "RECURSOS HUMANOS" ou "GESTÃO DE T.I.".
  - Verificar se categorias vazias não são exibidas.
- Como reverter: Reverter a lógica de loop simples no `layout.js` e remover o objeto `CATEGORIES` de `permissions.js`.

### [2026-05-05] Categorias Retráteis na Sidebar
- Autor: Antigravity
- Branch: main (UX enhancement)
- Arquivos alterados:
  - `layout.js` (Lógica de toggle e ícones)
  - `layout.css` (Animações de chevron e visibilidade de grupos)
  - `regras/regra_do_app.md` (Documentação)
- Tipo: Melhoria de Usabilidade.
- Motivo: Permitir que o usuário organize seu espaço de trabalho recolhendo setores que não está utilizando no momento.
- Impacto: Interface mais limpa e personalizável.
- Como testar:
  - Clicar sobre o nome de uma categoria (ex: "ADMINISTRATIVO").
  - Verificar se os itens abaixo dela desaparecem e o ícone de seta gira.
  - Recarregar a página e verificar se as categorias voltam a aparecer abertas por padrão.

### [2026-05-05] Refinamento da Sidebar (Closed by Default)
- Autor: Antigravity
- Branch: main (UX refinement)
- Arquivos alterados:
  - `layout.js` (Lógica de recolhimento inicial com inteligência de contexto)
  - `layout.css` (Ajuste de contraste das labels e espaçamento)
  - `regras/regra_do_app.md` (Documentação)
- Tipo: Ajuste de Interface e Visibilidade.
- Motivo: Melhorar o foco do usuário ao abrir o sistema e garantir que os títulos das categorias sejam legíveis em qualquer monitor.
- Impacto: Menu inicial mais limpo e títulos com leitura facilitada.
- Como testar:
  - Logar no sistema ou atualizar a página.
  - Verificar se as categorias extras estão fechadas.
  - Verificar se a categoria do módulo atual (ex: Meu Espaço) permanece aberta automaticamente.
  - Observar o novo brilho e destaque dos títulos das categorias.

### [2026-05-05] Localização de E-mails e Correção de Reset de Senha
- Autor: Antigravity
- Branch: main (Bugfix/Localization)
- Arquivos alterados:
  - `usuarios/app.js` (Adicionado `auth.languageCode = 'pt-br'`)
  - `regras/regra_do_app.md` (Documentação)
- Tipo: Ajuste de Comunicação Institucional.
- Motivo: E-mails de redefinição estavam sendo enviados em inglês e caindo em filtros de spam por falta de formatação correta.
- Impacto: Melhora a experiência de recuperação de conta para os funcionários.
- Como testar: No módulo Usuários, selecionar um usuário, clicar em "Redefinir Senha" e verificar se o e-mail chega em Português.

### [2026-05-05] Tela de Redefinição de Senha Personalizada
- Autor: Antigravity
- Branch: main (Feature/Security)
- Arquivos criados:
  - `redefinir-senha.html` (Layout institucional)
  - `redefinir-senha.js` (Lógica de confirmação de senha)
- Tipo: Melhoria de Identidade Visual e Segurança.
- Motivo: Substituir a página padrão e "feia" do Firebase por uma experiência premium que mantém o usuário dentro do ecossistema Órbita.
- Impacto: Aumento da confiança do usuário no processo de recuperação de conta.
- Configuração Necessária: No Console do Firebase, em **Authentication > Settings > User Actions**, alterar a **URL de Ação** para o endereço final desta página.

### [2026-05-05] Refinamento de Hierarquia na Sidebar
- Autor: Antigravity
- Branch: main (UX adjustment)
- Arquivos alterados:
  - `permissions.js` (Removida categoria de Meu Espaço)
  - `layout.js` (Lógica para itens de nível superior)
  - `regras/regra_do_app.md` (Documentação)
- Tipo: Ajuste de Interface.
- Motivo: Destacar o "Meu Espaço" como o ponto de partida central do usuário, deixando-o fora das categorias para acesso imediato.
- Impacto: Navegação mais rápida para a Home do sistema.

---
*Fim da documentação.*
