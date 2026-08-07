<div align="center">

# 💰 FinançasPro

**Sistema Completo de Gestão Financeira Pessoal**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple?logo=vite)](https://vitejs.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-red?logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-teal?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-blue?logo=docker)](https://www.docker.com/)

---

<p align="center">
  Uma aplicação full-stack moderna e intuitiva projetada para ajudar no controle total de finanças pessoais, desde o planejamento orçamentário e acompanhamento de metas até a geração de relatórios e exportações em PDF e Excel.
</p>

</div>

---

## 📌 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Infraestrutura & Banco de Dados](#infraestrutura--banco-de-dados)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Como Executar o Projeto](#-como-executar-o-projeto)
  - [Pré-requisitos](#pré-requisitos)
  - [1. Clonar o Repositório](#1-clonar-o-repositório)
  - [2. Configuração do Backend](#2-configuração-do-backend)
  - [3. Configuração do Frontend](#3-configuração-do-frontend)
  - [4. Executando com Docker Compose](#4-executando-com-docker-compose)
- [Documentação da API (Swagger)](#-documentação-da-api-swagger)
- [Licença](#-licença)

---

## 🚀 Visão Geral

O **FinançasPro** foi desenvolvido com as melhores práticas da web moderna, combinando a alta performance do **Vite + React 19** no frontend com a robustez e arquitetura escalável do **NestJS + Prisma ORM** no backend.

A aplicação conta com autenticação segura JWT, gráficos dinâmicos para visualização de gastos, limites orçamentários por categoria e geração automática de relatórios financeiros detalhados.

---

## ✨ Funcionalidades Principais

- 🔐 **Autenticação & Segurança**: Registro e login de usuários com senhas criptografadas (`bcrypt`) e tokens JWT.
- 📊 **Dashboard Financeiro**: Resumo em tempo real de entradas, saídas, saldo total e gráficos analíticos de despesas por categoria.
- 💸 **Gestão de Transações**: Cadastro, edição, exclusão e filtragem de receitas e despesas.
- 🏷️ **Categorias Customizadas**: Criação de categorias personalizadas com cores e ícones exclusivos.
- 🎯 **Metas Financeiras**: Definição de objetivos de economia com acompanhamento percentual de progresso e prazos.
- 📌 **Planejamento Orçamentário**: Definição de teto de gastos mensais por categoria com alertas visuais de consumo.
- 📄 **Relatórios & Exportação**: Exportação de relatórios financeiros detalhados nos formatos **PDF** e **Excel (.xlsx)**.
- 📖 **Documentação Swagger**: Documentação interativa de todas as rotas da API RESTful.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 19** & **TypeScript**
- **Vite** (Build tool e dev server de ultra velocidade)
- **React Router v7** (Roteamento client-side)
- **TanStack Query v5 (React Query)** (Gerenciamento de estado de servidor e cache)
- **Zustand** (Gerenciamento de estado global)
- **React Hook Form** + **Zod** (Validação de formulários e schemas)
- **Chart.js** & **react-chartjs-2** (Gráficos interativos)
- **Lucide React** (Ícones modernos)
- **Axios** (Cliente HTTP)

### Backend
- **Node.js** & **TypeScript**
- **NestJS v11** (Framework Node.js progressivo)
- **Prisma ORM v6** (Mapeamento objeto-relacional)
- **Passport.js** & **JWT** (Autenticação e proteção de rotas)
- **Class Validator** & **Class Transformer** (Validação de DTOs)
- **ExcelJS** & **PDFKit** (Geração e exportação de documentos)
- **Swagger / OpenAPI** (Documentação de endpoints)

### Infraestrutura & Banco de Dados
- **PostgreSQL 16** (Banco de dados relacional)
- **Docker** & **Docker Compose** (Contêineres para PostgreSQL e pgAdmin 4)
- **Vercel** (Suporte para deploy continuo)

---

## 📂 Estrutura do Projeto

```bash
FinancasPro/
├── backend/                  # Servidor API NestJS
│   ├── prisma/               # Schema e migrações do Prisma ORM
│   ├── src/                  # Código-fonte da API (Modules, Controllers, Services)
│   ├── test/                 # Testes unitários e E2E
│   └── package.json
├── frontend/                 # Aplicação Web React
│   ├── src/
│   │   ├── components/       # Componentes reusáveis da interface
│   │   ├── pages/            # Páginas da aplicação (Dashboard, Transações, etc.)
│   │   ├── store/            # Estado global (Zustand)
│   │   └── lib/              # Utilitários e cliente Axios
│   └── package.json
├── docker-compose.yml        # Configuração dos serviços PostgreSQL e pgAdmin
├── vercel.json               # Configurações de deploy no Vercel
├── LICENSE                   # Licença MIT
└── README.md                 # Documentação do projeto
```

---

## ⚙️ Como Executar o Projeto

### Pré-requisitos

Certifique-se de ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (v18 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) (opcional, para rodar o PostgreSQL localmente)

---

### 1. Clonar o Repositório

```bash
git clone https://github.com/carvpablo/FinancasPro.git
cd FinancasPro
```

---

### 2. Configuração do Backend

1. Acesse o diretório do backend:
   ```bash
   cd backend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie o arquivo `.env` na raiz da pasta `backend` baseando-se no exemplo:
   ```env
   DATABASE_URL="postgresql://admin:admin123@localhost:5432/financas?schema=public"
   DIRECT_URL="postgresql://admin:admin123@localhost:5432/financas?schema=public"
   JWT_SECRET="sua-chave-secreta-jwt-aqui"
   JWT_EXPIRES_IN="7d"
   PORT=3001
   ```

4. Execute as migrações do banco de dados (Prisma):
   ```bash
   npx prisma migrate dev
   ```

5. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run start:dev
   ```
   *O backend estará rodando em:* `http://localhost:3001`

---

### 3. Configuração do Frontend

1. Em outro terminal, acesse a pasta do frontend:
   ```bash
   cd frontend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie o arquivo `.env` na pasta `frontend`:
   ```env
   VITE_API_URL=http://localhost:3001
   ```

4. Inicie o servidor de desenvolvimento Vite:
   ```bash
   npm run dev
   ```
   *O frontend estará disponível em:* `http://localhost:5173`

---

### 4. Executando com Docker Compose

Se preferir rodar o banco de dados PostgreSQL e o pgAdmin via Docker:

```bash
docker-compose up -d
```

Serviços iniciados:
- **PostgreSQL**: `localhost:5432`
- **pgAdmin 4**: `http://localhost:5050` (Login: `admin@financas.com` | Senha: `admin123`)

---

## 📚 Documentação da API (Swagger)

Com o backend em execução, acesse a documentação interativa da API no seu navegador:

```
http://localhost:3001/api/docs
```

Através da interface do Swagger, você pode explorar todas as rotas de autenticação, transações, categorias, orçamentos, metas e testar as requisições diretamente.

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">
  Desenvolvido por <strong>Pablo</strong> 🚀
</div>
