import { config } from "dotenv";
config({ path: ".env.local" });
import bcrypt from "bcryptjs";
import { connectDB } from "../src/lib/db";
import { User } from "../src/models/User";

async function main() {
  const name = process.env.SEED_ADMIN_NAME || "Administrador";
  const email = (process.env.SEED_ADMIN_EMAIL || "").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "";

  if (!email || !password) {
    console.error(
      "Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD (em .env.local ou na linha de comando) antes de rodar este script."
    );
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Usuário ${email} já existe. Nada a fazer.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ name, email, passwordHash, role: "admin" });

  console.log(`Usuário admin criado: ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
