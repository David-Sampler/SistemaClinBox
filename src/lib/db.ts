// Este arquivo é responsável por conectar o sistema ao banco de dados MongoDB.
// Ele é usado por todas as rotas de API que precisam ler ou salvar dados.
import mongoose from "mongoose";

// Importa TODOS os models aqui (só pelo efeito colateral de registrar cada
// um no Mongoose — "import '@/models/X'" sem usar o valor) — mesmo que a
// rota que chamou connectDB() só precise de um model diretamente.
//
// Por quê: um "populate('patient', ...)" só funciona se o model Patient já
// foi registrado nesse processo. Em desenvolvimento isso nunca dava
// problema porque o servidor fica de pé o tempo todo e, cedo ou tarde,
// alguma rota importa cada model. Só que na Vercel cada rota roda numa
// função separada, e no primeiro pedido depois de "esfriar" (cold start)
// só os models que O PRÓPRIO ARQUIVO da rota importa é que existem —
// então "GET /api/appointments" (que só importa Appointment) quebrava com
// "MissingSchemaError: Schema hasn't been registered for model 'Patient'"
// sempre que tentava popular o paciente vinculado, bem na primeira consulta
// depois do cold start. Registrando tudo de uma vez aqui, isso nunca mais
// acontece — nenhuma rota precisa lembrar de importar um model só porque
// vai popular uma referência pra ele.
import "@/models/User";
import "@/models/Patient";
import "@/models/Appointment";
import "@/models/Attachment";
import "@/models/Budget";
import "@/models/ClinicDocument";
import "@/models/ClinicalRecord";
import "@/models/Odontogram";
import "@/models/Payment";
import "@/models/Product";
import "@/models/RolePermission";
import "@/models/Sale";
import "@/models/Service";

// Formato do "cache" de conexão: guardamos a conexão já aberta (conn) e,
// enquanto ela ainda está sendo criada, a promessa (promise) dessa conexão.
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Em desenvolvimento, o Next.js recarrega os módulos várias vezes.
// Guardamos a conexão numa variável global para não abrir uma conexão nova
// com o banco a cada recarregamento (isso evitaria "esgotar" as conexões do MongoDB).
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

// Função principal: conecta ao MongoDB (ou reaproveita a conexão já existente).
// Deve ser chamada no início de toda rota de API antes de usar um "model" (User, Patient, etc).
export async function connectDB() {
  // Se já existe uma conexão pronta, reaproveita ela.
  if (cache.conn) return cache.conn;

  // A URL de conexão do MongoDB vem de uma variável de ambiente (arquivo .env.local),
  // nunca deve ficar escrita diretamente no código por segurança.
  // Lemos aqui dentro (e não no topo do arquivo) para dar tempo do .env.local
  // já estar carregado quando esta função for chamada.
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("Defina a variável de ambiente MONGODB_URI");
  }

  // Se ninguém começou a conectar ainda, inicia a conexão agora.
  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  // Espera a conexão terminar e guarda o resultado no cache.
  cache.conn = await cache.promise;
  return cache.conn;
}
