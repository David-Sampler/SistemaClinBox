# ClinBox

Sistema de gestão para clínicas odontológicas — cadastro de pacientes,
agenda, prontuário/odontograma, financeiro, vendas e documentos
clínicos, com suporte a múltiplos usuários (admin, dentista, recepção).

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + TypeScript
- [MongoDB Atlas](https://www.mongodb.com/atlas) + Mongoose
- [NextAuth](https://authjs.dev) (Credentials + JWT)
- Tailwind CSS v4

## Desenvolvimento

```bash
npm install
npm run dev
```

Crie um arquivo `.env.local` com:

```
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/clinbox
AUTH_SECRET=uma-chave-secreta-aleatoria
```

Abra [http://localhost:3000](http://localhost:3000).
