import "server-only";
import bcrypt from "bcryptjs";

const ROUNDS = 11;

// Hash de una contraseña aleatoria para igualar tiempos cuando el email no existe.
const DUMMY_HASH = "$2b$11$.x/I5B9FgGuNfLtyAlgoA.YXaZQMf/I6T3gCsEOTn6H1ycMQsCH1u";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(password, hash);
}
