
# GCTV - Sistema de Gestão de Clientes e Assinaturas
<br>

 - Uma aplicação full-stack robusta e de alta performance, projetada para o gerenciamento completo do ciclo de vida de clientes de serviços por assinatura. A plataforma oferece um controle financeiro detalhado e um dashboard analítico para tomada de decisões estratégicas.

![](https://raw.githubusercontent.com/richardcastrogois/GCTV/main/frontend/public/logingctv.png)


 🔗&nbsp;&nbsp;&nbsp;Links
 Aplicação ao Vivo:

````bash
https://gctv-ui.vercel.app/
````
### Faça o teste:
````
- Usuario: admin
- Senha: admin
````

<br>



<br>

## 🚀 Sobre o Projeto

  O GCTV nasceu como uma solução versátil para gerenciar clientes de qualquer serviço baseado em assinatura, como IPTV, academias, clubes, etc. O sistema centraliza o cadastro de clientes, planos e métodos de pagamento, automatizando o controle de vencimentos e o registro de transações financeiras.

  O grande diferencial é o Dashboard Analítico, que oferece uma visão clara e objetiva da saúde do negócio, permitindo a filtragem de dados por período e a visualização de métricas essenciais, como faturamento bruto por método de pagamento (com regras de negócio específicas) e lucro líquido diário. A tela de login consome a API do TMDB para exibir banners dinâmicos de filmes em cartaz, criando uma experiência de usuário moderna e engajadora.

<br>

## ✨ Principais Funcionalidades

- 🔐 **Autenticação Segura**: Sistema de login robusto com Tokens JWT, implementando o padrão de Access Token (15m) e Refresh Token (7d) para manter a sessão do usuário segura e contínua. 

- 👤 **Gestão Completa de Clientes (CRUD)**: Interface intuitiva para criar, visualizar, editar e deletar clientes, com paginação e busca avançada.

- 💳 **Controle Financeiro Detalhado**: Modal de gerenciamento de pagamentos para cada cliente, permitindo o registro de múltiplas transações e mantendo um histórico financeiro preciso.

- 📊 **Dashboard Interativo**:

  - Visualização de faturamento bruto com regras de negócio customizadas por método de pagamento.

  - Gráfico de lucro líquido diário com filtros dinâmicos por mês e ano.

  - Análise de métricas de negócio em tempo real: clientes ativos, distribuição por planos e métodos de pagamento.

- ⚙️ **Lógica de Negócio Avançada**: Sistema de cores para status de vencimento de clientes, facilitando a identificação visual de assinaturas próximas de expirar.

- 🗂️ **Gerenciamento de Expirados**: Tela dedicada para clientes com assinaturas vencidas, permitindo consulta e reativação.

<br>

## 🛠️ Arquitetura e Tecnologias Utilizadas
  Este projeto foi construído utilizando uma arquitetura de monorepo, separando as responsabilidades entre o Frontend e o Backend para maior escalabilidade e manutenção.

**Frontend (React / Next.js)**

- **Framework Principal:** Next.js 14 para renderização otimizada e performance.

- **Linguagem:** TypeScript para tipagem estática e segurança no desenvolvimento.

- **Gerenciamento de Estado do Servidor:** TanStack React Query para caching, sincronização e atualização de dados da API de forma eficiente.

- **Estilização:** Tailwind CSS para uma UI moderna e responsiva.

- **Visualização de Dados:** Chart.js com react-chartjs-2 para gráficos interativos.

- **Componentes de UI:** react-select, react-datepicker, e react-icons para uma experiência de usuário rica.

- **Notificações:** React Toastify para feedback visual ao usuário.

- **Requisições HTTP:** Axios para comunicação com a API do backend.

**Backend (Node.js / Express)**

- **Framework Principal:** Express.js para a construção de uma API RESTful robusta e escalável.

- **Linguagem:** TypeScript com ts-node e nodemon para um ambiente de desenvolvimento produtivo.

- **ORM (Object-Relational Mapping):** Prisma para uma interação segura e tipada com o banco de dados.

- **Autenticação:** JSON Web Tokens (JWT) e Bcrypt.js para hashing de senhas e gerenciamento de sessões.

- **Banco de Dados:** PostgreSQL.

- **Geração de Dados Fictícios:** Faker.js para popular o banco em ambiente de desenvolvimento.

**Infraestrutura e Deploy**

- **Banco de Dados:** Neon (PostgreSQL Serverless) para escalabilidade e gerenciamento simplificado.

- **Hospedagem:** Vercel, com deploys contínuos (CI/CD) a partir de pushes para a branch main no GitHub, garantindo a separação total entre os ambientes de frontend e backend.

<br>

## 📂 Estrutura do Projeto
O projeto é organizado em uma arquitetura de monorepo, com uma clara separação entre o frontend e o backend, facilitando a manutenção e o desenvolvimento independente.

````
GCTV/
├── backend/
│   ├── prisma/
│   │   ├── migrations/         # Histórico de alterações do banco de dados
│   │   └── schema.prisma       # Definição dos modelos e relações do banco
│   ├── src/
│   │   ├── controllers/        # Lógica de negócio (o que cada rota faz)
│   │   ├── lib/                # Configurações de bibliotecas (ex: Prisma Client)
│   │   ├── middleware/         # Funções intermediárias (ex: verificação de token)
│   │   ├── routes/             # Definição dos endpoints da API
│   │   ├── index.ts            # Ponto de entrada principal do servidor backend
│   │   └── seed.ts             # Script para popular o banco com dados fictícios
│   ├── .env                    # Variáveis de ambiente (segredos)
│   ├── package.json            # Dependências e scripts do backend
│   └── tsconfig.json           # Configurações do TypeScript para o backend
│
└── frontend/
    ├── public/                 # Arquivos estáticos (imagens, fontes)
    ├── src/
    │   ├── app/                # Estrutura de rotas principal do Next.js 14
    │   │   ├── clients/        # Rota e componentes da página de clientes ativos
    │   │   ├── dashboard/      # Rota e componentes do dashboard principal
    │   │   ├── expired/        # Rota e componentes da página de clientes expirados
    │   │   ├── layout.tsx      # Layout principal da aplicação
    │   │   └── page.tsx        # Página de Login
    │   ├── components/         # Componentes React reutilizáveis (Navbar, etc.)
    │   ├── contexts/           # Contextos React para gerenciamento de estado global
    │   ├── hooks/              # Hooks customizados (ex: useAuth)
    │   ├── types/              # Definições de tipos do TypeScript
    │   └── utils/              # Funções utilitárias (configuração do Axios, etc.)
    ├── .env                    # Variáveis de ambiente do frontend
    ├── next.config.mjs         # Configurações do Next.js
    ├── package.json            # Dependências e scripts do frontend
    └── tailwind.config.js      # Configurações do Tailwind CSS
````

<br>


## 🧠 Desafios e Aprendizados
Um dos principais objetivos deste projeto foi demonstrar a capacidade de construir uma aplicação de nível profissional utilizando uma stack de custo zero, sem sacrificar a performance ou a experiência do usuário. A seleção de serviços como Vercel para hospedagem e Neon para o banco de dados serverless foi estratégica, mas trouxe o desafio de otimizar o código para lidar com as particularidades de um ambiente gratuito, como os "cold starts" (o tempo para a primeira resposta do servidor). Isso exigiu um foco intenso em performance, tanto no backend, com a criação de queries unificadas para o dashboard, quanto no frontend, com o uso eficiente do React Query para caching.

Além disso, a configuração de um pipeline de CI/CD seguro e isolado, criando ambientes distintos para o projeto do cliente e para esta versão de portfólio, cada um com seu próprio banco de dados e variáveis de ambiente, foi um aprendizado crucial em práticas de DevOps, garantindo a integridade e segurança dos dados.

<br>

---

## 🖥️ Imagens do Projeto

| Login |
| :---: |
![Tela de Login](https://raw.githubusercontent.com/richardcastrogois/GCTV/main/frontend/public/logingctv.png)

| Dashboard |
| :---: |
![Tela do Dashboard](https://raw.githubusercontent.com/richardcastrogois/GCTV/main/frontend/public/dashboardnew.png)

| Clientes Ativos |
| :---: |
![Tela de Clientes Ativos](https://raw.githubusercontent.com/richardcastrogois/GCTV/main/frontend/public/clienteativonew.png)


| Clientes Expirados |
| :---: |
 ![Tela de Clientes Expirados](https://raw.githubusercontent.com/richardcastrogois/GCTV/main/frontend/public/clienteexpiradonew.png) |

| Cadastro de Cliente |
| :---: |
![Tela de Cadastro de Cliente](https://raw.githubusercontent.com/richardcastrogois/GCTV/main/frontend/public/cadastrarclientenew.png)

| Edição de Cliente |
| :---: |
![Tela de Edição de Cliente](https://raw.githubusercontent.com/richardcastrogois/GCTV/main/frontend/public/editarclientenew.png)

| Detalhe do Cliente |
| :---: |
![Tela de Detalhes do Cliente](https://raw.githubusercontent.com/richardcastrogois/GCTV/main/frontend/public/detalheclientenew.png)

| Exclusão de Cliente |
| :---: |
![Tela de Exclusã de Cliente](https://raw.githubusercontent.com/richardcastrogois/GCTV/main/frontend/public/excluirclientenew.png)

| Renovação de Cliente |
| :---: |
![Tela de Renovação de Cliente](https://raw.githubusercontent.com/richardcastrogois/GCTV/main/frontend/public/renovarclintenew.png)

| Gerenciador de Pagamento |
| :---: |
![Tela de Gerenciamento de Pagamento](https://raw.githubusercontent.com/richardcastrogois/GCTV/main/frontend/public/gerenciarpagamentonew.png)

| Responsividade Mobile |
| :---: |
![Tela para Mobile](https://raw.githubusercontent.com/richardcastrogois/GCTV/main/frontend/public/responsividadecel1.png)

| Responsividade Mobile, exemplo com pesquisa |
| :---: |
![Tela para Mobile com pesquisa](https://raw.githubusercontent.com/richardcastrogois/GCTV/main/frontend/public/responsividadecel2.png)

<br>

## ⚙️ Como Executar Localmente


  ### 1. Clone este repositório
 ```bash
  git clone https://github.com/richardcastrogois/GCTV.git
  ```

  ### 2. Navegue até a pasta do backend e instale as dependências
  ```bash
  cd backend
  npm install
  ```

  ### 3. Navegue até a pasta do frontend e instale as dependências
  ```bash
  cd ../frontend
  npm install
  ```

  ### 4. Configure as variáveis de ambiente
  <ul>
    <li>Na raiz do backend, crie um arquivo <code>.env</code> e adicione as chaves</li>
    <li><strong>DATABASE_URL</strong> e <strong>JWT_SECRET</strong>.</li>
  </ul>


  ### 5. Rode as migrações e o seed do banco de dados
  ```bash
  cd ../backend
  npx prisma db push
  npx prisma db seed
  ```

  ### 6. Inicie os servidores (em terminais separados)
  -  No terminal 1 (a partir da pasta 'backend'):
  ```bash
  npm run dev
  ```

  -  No terminal 2 (a partir da pasta 'frontend'):
  ```bash
  npm run dev
  ```

  ### 7. Acesse o projeto no navegador:
  ```bash
  http://localhost:3000
  ```

<br>

### 📄 Licença
Este projeto está sob a licença MIT. Isso significa que você é livre para usar, modificar e distribuir o código, desde que mantenha o aviso de copyright original.

<br>

### 👨‍💻 Contato  
### **Richard Castro Gois**  

- [LinkedIn](https://www.linkedin.com/in/richard-castro-00a6b42bb)  
- [GitHub](https://github.com/richardcastrogois)  
