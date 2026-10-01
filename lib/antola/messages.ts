/**
 * Banco de mensajes de Antola. Cercana, animada, con algo de humor; habla de
 * tú y en frases cortas. Nunca regaña: si algo no salió, anima.
 *
 * Cada situación tiene variantes para el tono animado (LIVELY) y el tranquilo
 * (CALM); las que no indican tono valen para los dos. Variables entre llaves:
 * {nombre}, {tareas}, {tarea}, {racha}, {habitos}, {vencidas}, {nivel},
 * {titulo}, {logro}, {reto}, {completadas}, {pendientes}, {xp}.
 *
 * El servidor elige una variante sin repetir ninguna de las 10 últimas que ha
 * visto ese usuario (AntolaMessageLog).
 */

export type Tone = "LIVELY" | "CALM";
export type Expression = "feliz" | "celebrando" | "orgullosa" | "pensativa" | "preocupada" | "dormida" | "saludando";

export type Message = { id: string; text: string; tone?: Tone };

export type Situation =
  | "buenos_dias"
  | "pendientes_manana"
  | "pendientes_tarde"
  | "pendientes_noche"
  | "vencidas"
  | "racha_peligro"
  | "dia_completo"
  | "dia_vacio"
  | "noche"
  | "toque"
  | "tarea_hecha"
  | "habito_hecho"
  | "sugerencia"
  | "propuesta_vencidas"
  | "consejo"
  | "subida_nivel"
  | "logro"
  | "revision_intro"
  | "revision_buena"
  | "revision_floja"
  | "revision_pendientes"
  | "noti_manana"
  | "noti_noche"
  | "noti_vencidas"
  | "noti_semanal"
  | "noti_racha"
  | "noti_te_echo"
  | "noti_logro"
  | "noti_reto";

/** Expresión de Antola en cada situación. */
export const SITUATION_EXPRESSION: Partial<Record<Situation, Expression>> = {
  buenos_dias: "saludando",
  pendientes_manana: "feliz",
  pendientes_tarde: "feliz",
  pendientes_noche: "pensativa",
  vencidas: "pensativa",
  racha_peligro: "preocupada",
  dia_completo: "orgullosa",
  dia_vacio: "saludando",
  noche: "dormida",
  toque: "feliz",
  tarea_hecha: "celebrando",
  habito_hecho: "celebrando",
  subida_nivel: "celebrando",
  logro: "celebrando",
  revision_intro: "saludando",
  revision_buena: "orgullosa",
  revision_floja: "feliz",
  revision_pendientes: "pensativa",
};

const L = "LIVELY" as const;
const C = "CALM" as const;

export const MESSAGES: Record<Situation, Message[]> = {
  buenos_dias: [
    { id: "bd1", tone: L, text: "¡Buenos días, {nombre}! Hoy tienes {tareas}. ¿Empezamos?" },
    { id: "bd2", tone: L, text: "¡Arriba, {nombre}! Que el café haga su magia y nosotras la nuestra." },
    { id: "bd3", tone: L, text: "¡Hola, hola! Día nuevo, hormiga nueva. Vamos a por {tareas}." },
    { id: "bd4", tone: L, text: "¡Buenos días! Ya he ordenado el hormiguero. Te toca: {tareas}." },
    { id: "bd5", tone: L, text: "¡Qué bien verte, {nombre}! Hoy pinta a buen día." },
    { id: "bd6", tone: L, text: "¡Buenos días! Paso a pasito, como las hormigas. 🐜" },
    { id: "bd7", tone: C, text: "Buenos días, {nombre}. Hoy tienes {tareas}. Con calma." },
    { id: "bd8", tone: C, text: "Hola, {nombre}. Un día nuevo, sin prisa." },
    { id: "bd9", tone: C, text: "Buenos días. Empieza por lo pequeño; lo demás viene solo." },
    { id: "bd10", tone: C, text: "Buenos días. Respira hondo: {tareas} por delante." },
  ],
  pendientes_manana: [
    { id: "pm1", tone: L, text: "Te quedan {pendientes}. ¡La mañana es nuestra!" },
    { id: "pm2", tone: L, text: "¡Vamos, {nombre}! {pendientes} y el día es tuyo." },
    { id: "pm3", tone: L, text: "Una hormiga carga 50 veces su peso. Tú puedes con {pendientes}." },
    { id: "pm4", tone: L, text: "¡A tope! Quedan {pendientes}. Yo te animo desde aquí." },
    { id: "pm5", tone: L, text: "Si tachamos una ahora, el resto parece más fácil. ¡Prometido!" },
    { id: "pm6", tone: C, text: "Quedan {pendientes}. Una cosa cada vez." },
    { id: "pm7", tone: C, text: "Buena mañana para avanzar. Te quedan {pendientes}." },
    { id: "pm8", tone: C, text: "Sin agobios: {pendientes} y todo el día por delante." },
  ],
  pendientes_tarde: [
    { id: "pt1", tone: L, text: "¡Buenas tardes, {nombre}! Quedan {pendientes}. ¿Le damos?" },
    { id: "pt2", tone: L, text: "La tarde también cuenta. {pendientes} y listo." },
    { id: "pt3", tone: L, text: "¿Un empujoncito? Te quedan {pendientes}." },
    { id: "pt4", tone: L, text: "¡Ya llevamos {completadas}! Quedan {pendientes}." },
    { id: "pt5", tone: L, text: "Mis antenas dicen que hoy acabamos {pendientes}. ¡Vamos!" },
    { id: "pt6", tone: C, text: "Buenas tardes. Quedan {pendientes}, a tu ritmo." },
    { id: "pt7", tone: C, text: "Llevas {completadas}. Bien hecho. Quedan {pendientes}." },
    { id: "pt8", tone: C, text: "Un poco más y descansas. Te quedan {pendientes}." },
  ],
  pendientes_noche: [
    { id: "pn1", tone: L, text: "Quedan {pendientes}. Si hoy no da, mañana lo sacamos. Yo te ayudo." },
    { id: "pn2", tone: L, text: "¿Una última? Quedan {pendientes}. Si no, ¡a descansar!" },
    { id: "pn3", tone: L, text: "Lo que no salga hoy, lo movemos a mañana. Sin dramas." },
    { id: "pn4", tone: L, text: "Ya casi es de noche. Elige una y mañana seguimos." },
    { id: "pn5", tone: C, text: "Quedan {pendientes}. Mañana es otro día; no pasa nada." },
    { id: "pn6", tone: C, text: "Ha sido un día largo. Haz solo lo que te apetezca." },
    { id: "pn7", tone: C, text: "Si hoy no llegas, lo reorganizamos mañana con calma." },
  ],
  vencidas: [
    { id: "ve1", tone: L, text: "Tienes {vencidas} de días anteriores. ¿Las pasamos a mañana?" },
    { id: "ve2", tone: L, text: "Se han quedado {vencidas} por el camino. Las rescatamos juntas." },
    { id: "ve3", tone: L, text: "Hay {vencidas} esperando. Sin culpas: elegimos y seguimos." },
    { id: "ve4", tone: C, text: "Quedan {vencidas} de otros días. Podemos moverlas." },
    { id: "ve5", tone: C, text: "Hay {vencidas} pendientes. Decide con calma qué hacer con ellas." },
  ],
  racha_peligro: [
    { id: "rp1", tone: L, text: "¡Tu racha de {racha} días te necesita! Un empujón y la salvamos." },
    { id: "rp2", tone: L, text: "¡Ay, que la racha de {racha} se escapa! Vamos a por ella." },
    { id: "rp3", tone: L, text: "{racha} días seguidos… ¡no la dejes caer hoy! Yo te acompaño." },
    { id: "rp4", tone: C, text: "Llevas {racha} días seguidos. Aún estás a tiempo de mantenerla." },
    { id: "rp5", tone: C, text: "Tu racha de {racha} días sigue viva. Con poco basta." },
  ],
  dia_completo: [
    { id: "dc1", tone: L, text: "¡Día completado, {nombre}! Estoy que no quepo en el hormiguero." },
    { id: "dc2", tone: L, text: "¡Todo hecho! Hoy te has ganado un descanso de reina. 👑" },
    { id: "dc3", tone: L, text: "¡Pleno! {racha} días de racha. Qué orgullo." },
    { id: "dc4", tone: L, text: "¡Lo has bordado! Mañana más, pero hoy a disfrutar." },
    { id: "dc5", tone: C, text: "Día completado. Buen trabajo, {nombre}." },
    { id: "dc6", tone: C, text: "Todo hecho por hoy. Descansa, te lo has ganado." },
    { id: "dc7", tone: C, text: "Has terminado lo de hoy. Disfruta de la tarde." },
  ],
  dia_vacio: [
    { id: "dv1", tone: L, text: "¡Día despejado! Añade algo con el + o aprovecha para descansar." },
    { id: "dv2", tone: L, text: "Nada para hoy. ¿Planificamos algo o nos tumbamos al sol?" },
    { id: "dv3", tone: L, text: "Lista vacía. Si se te ocurre algo, pulsa el + y lo apunto." },
    { id: "dv4", tone: C, text: "Hoy no hay nada planificado. Puedes añadir algo con el +." },
    { id: "dv5", tone: C, text: "Día tranquilo. Si quieres, apunta algo con el +." },
  ],
  noche: [
    { id: "no1", tone: L, text: "Zzz… ¡Ay! Es tarde, {nombre}. Mañana seguimos." },
    { id: "no2", tone: L, text: "Las hormigas también duermen. Hasta mañana. 🌙" },
    { id: "no3", tone: L, text: "Buenas noches. Mañana lo petamos." },
    { id: "no4", tone: C, text: "Es tarde. Descansa, mañana será otro día." },
    { id: "no5", tone: C, text: "Buenas noches, {nombre}. Lo de mañana puede esperar." },
  ],
  toque: [
    { id: "to1", tone: L, text: "¡Ji, ji! ¡Que me haces cosquillas!" },
    { id: "to2", tone: L, text: "¿Sabías que las hormigas no tienen orejas? Te escucho con las patas." },
    { id: "to3", tone: L, text: "¡Hola! Sigo aquí, vigilando tus tareas. 🫡" },
    { id: "to4", tone: L, text: "Si me das más toques, pido aumento de migas." },
    { id: "to5", tone: L, text: "¡Choca esas seis patas!" },
    { id: "to6", tone: L, text: "¿Me has llamado? ¡A tus órdenes, jefa!" },
    { id: "to7", tone: L, text: "Hoy me siento muy productiva. ¿Y tú?" },
    { id: "to8", tone: L, text: "Las hormigas trabajamos en equipo. Tú y yo, equipazo." },
    { id: "to9", tone: L, text: "Llevo {racha} días a tu lado. ¡Y los que quedan!" },
    { id: "to10", tone: L, text: "Psst… nivel {nivel}. Vas como un cohete. 🚀" },
    { id: "to11", tone: C, text: "Hola. Aquí sigo, contigo." },
    { id: "to12", tone: C, text: "Un paso cada vez. Lo estás haciendo bien." },
    { id: "to13", tone: C, text: "Respira. Lo importante sale solo." },
    { id: "to14", tone: C, text: "Nivel {nivel}. Poco a poco, se nota." },
    { id: "to15", tone: C, text: "Gracias por pasar a saludar." },
  ],
  tarea_hecha: [
    { id: "th1", tone: L, text: "¡Toma ya!" },
    { id: "th2", tone: L, text: "¡Una menos!" },
    { id: "th3", tone: L, text: "¡Así se hace!" },
    { id: "th4", tone: L, text: "¡Qué máquina!" },
    { id: "th5", tone: L, text: "¡Tachada! ✨" },
    { id: "th6", tone: L, text: "¡Bien! Me pongo a bailar." },
    { id: "th7", tone: C, text: "Hecho. Bien." },
    { id: "th8", tone: C, text: "Una menos." },
    { id: "th9", tone: C, text: "Buen trabajo." },
  ],
  habito_hecho: [
    { id: "hh1", tone: L, text: "¡Hábito hecho! La constancia es lo tuyo." },
    { id: "hh2", tone: L, text: "¡Otro día más! Así se construye." },
    { id: "hh3", tone: L, text: "¡Bien! Paso a paso, como buena hormiga." },
    { id: "hh4", tone: C, text: "Hecho. La constancia suma." },
    { id: "hh5", tone: C, text: "Un día más. Bien." },
  ],
  sugerencia: [
    { id: "su1", tone: L, text: "Te propongo empezar por: {tarea}" },
    { id: "su2", tone: L, text: "¿Qué tal si empezamos por: {tarea}?" },
    { id: "su3", tone: L, text: "Mi antena dice que toca: {tarea}" },
    { id: "su4", tone: C, text: "Te propongo empezar por: {tarea}" },
    { id: "su5", tone: C, text: "Quizá puedes empezar por: {tarea}" },
  ],
  propuesta_vencidas: [
    { id: "pv1", text: "¿Las pasamos a mañana?" },
    { id: "pv2", text: "¿Las movemos a mañana y respiramos?" },
  ],
  consejo: [
    { id: "co1", text: "Consejo: pulsa el + para apuntar algo en dos segundos. Sin fecha, va a la Bandeja." },
    { id: "co2", text: "Consejo: en Ideas puedes dictar con el micrófono y convertir una idea en tarea." },
    { id: "co3", text: "Consejo: marca un objetivo como «Foco» y lo verás siempre en Hoy." },
    { id: "co4", text: "Consejo: la revisión semanal del domingo te deja la semana lista en 5 minutos." },
    { id: "co5", text: "Consejo: si una tarea se repite cada día, ponla en «Repetir» y aparecerá sola." },
    { id: "co6", text: "Consejo: con las migas puedes comprarme accesorios. ¡Me encantan las gafas!" },
    { id: "co7", text: "Consejo: un protector de racha te salva un día malo. Puedes guardar dos." },
    { id: "co8", text: "Consejo: en Ajustes puedes activar «No molestar» para que no te avise de noche." },
    { id: "co9", text: "Consejo: divide una tarea grande en subtareas; tacharlas da mucho gusto." },
    { id: "co10", text: "Consejo: un día es productivo con todos tus hábitos hechos o 3 tareas completadas." },
    { id: "co11", text: "Consejo: los retos de la semana cambian cada lunes. Míralos en mi pantalla." },
    { id: "co12", text: "Consejo: en Estadísticas puedes ver cómo te ha ido el último mes." },
  ],
  subida_nivel: [
    { id: "sn1", tone: L, text: "¡Nivel {nivel}! Ahora eres {titulo}. ¡Estoy flipando!" },
    { id: "sn2", tone: L, text: "¡Subimos al nivel {nivel}! Esto hay que celebrarlo. 🎉" },
    { id: "sn3", tone: L, text: "¡Nivel {nivel}, {nombre}! Qué barbaridad." },
    { id: "sn4", tone: C, text: "Nivel {nivel}. Te lo has ganado, {titulo}." },
    { id: "sn5", tone: C, text: "Has llegado al nivel {nivel}. Enhorabuena." },
  ],
  logro: [
    { id: "lo1", tone: L, text: "¡Logro desbloqueado: {logro}! Me lo apunto en la pared del hormiguero." },
    { id: "lo2", tone: L, text: "¡{logro}! Esto va directo a tu vitrina." },
    { id: "lo3", tone: C, text: "Nuevo logro: {logro}. Bien hecho." },
    { id: "lo4", tone: C, text: "Has conseguido «{logro}». Enhorabuena." },
  ],
  revision_intro: [
    { id: "ri1", tone: L, text: "¡Hora de la revisión! Miramos la semana juntas, que es un momento." },
    { id: "ri2", tone: L, text: "¡Revisión semanal! Café en mano y vamos a ver qué tal." },
    { id: "ri3", tone: C, text: "Vamos a repasar la semana. Sin prisa." },
    { id: "ri4", tone: C, text: "Un ratito para mirar atrás y preparar lo que viene." },
  ],
  revision_buena: [
    { id: "rb1", tone: L, text: "¡{completadas} completadas esta semana! Eres una máquina." },
    { id: "rb2", tone: L, text: "¡Menuda semana! {completadas} hechas. Estoy orgullosísima." },
    { id: "rb3", tone: C, text: "{completadas} completadas. Ha sido una buena semana." },
    { id: "rb4", tone: C, text: "Has avanzado mucho: {completadas} tareas hechas." },
  ],
  revision_floja: [
    { id: "rf1", tone: L, text: "Semana tranquilita: {completadas} hechas. ¡La próxima la petamos juntas!" },
    { id: "rf2", tone: L, text: "No todas las semanas son de récord. Lo importante es seguir. 💪" },
    { id: "rf3", tone: C, text: "Ha sido una semana suave. Está bien; la próxima seguimos." },
    { id: "rf4", tone: C, text: "{completadas} hechas. Cada paso cuenta." },
  ],
  revision_pendientes: [
    { id: "rq1", tone: L, text: "Quedan {pendientes}. Las recolocamos y listo." },
    { id: "rq2", tone: L, text: "Hay {pendientes} sin hacer. Elegimos día para cada una, ¿vale?" },
    { id: "rq3", tone: C, text: "Quedan {pendientes}. Decide con calma cuándo hacerlas." },
  ],
  noti_manana: [
    { id: "nm1", tone: L, text: "¡Buenos días, {nombre}! Hoy tienes {tareas}." },
    { id: "nm2", tone: L, text: "¡Arriba! Hoy toca {tareas}. ¡A por ello!" },
    { id: "nm3", tone: L, text: "¡Día nuevo! {tareas} te esperan." },
    { id: "nm4", tone: C, text: "Buenos días, {nombre}. Hoy tienes {tareas}." },
    { id: "nm5", tone: C, text: "Buenos días. Para hoy: {tareas}." },
  ],
  noti_noche: [
    { id: "nn1", tone: L, text: "Te {pendientes} por hacer hoy. ¿Una más o mañana?" },
    { id: "nn2", tone: L, text: "¡Último empujón! Te {pendientes} hoy." },
    { id: "nn3", tone: C, text: "Te {pendientes} hoy. Si no da tiempo, mañana." },
    { id: "nn4", tone: C, text: "Repaso de la noche: te {pendientes}." },
  ],
  noti_vencidas: [
    { id: "nv1", tone: L, text: "Tienes {vencidas}. ¿Las movemos juntas?" },
    { id: "nv2", tone: L, text: "{vencidas} se han quedado atrás. ¡Las rescatamos!" },
    { id: "nv3", tone: C, text: "Tienes {vencidas}. Puedes reprogramarlas." },
  ],
  noti_semanal: [
    { id: "ns1", tone: L, text: "¡Hora de la revisión semanal! Son 5 minutos y la semana queda lista." },
    { id: "ns2", tone: L, text: "¡Domingo de revisión! Te espero con el café." },
    { id: "ns3", tone: C, text: "Es buen momento para tu revisión semanal." },
  ],
  noti_racha: [
    { id: "nr1", tone: L, text: "¡Tu racha de {racha} días está en peligro! Aún estás a tiempo." },
    { id: "nr2", tone: L, text: "¡No dejes caer tus {racha} días! Un empujoncito y la salvamos." },
    { id: "nr3", tone: C, text: "Llevas {racha} días seguidos. Aún puedes mantener la racha hoy." },
  ],
  noti_te_echo: [
    { id: "nt1", tone: L, text: "¡Te echo de menos, {nombre}! El hormiguero no es lo mismo sin ti." },
    { id: "nt2", tone: L, text: "¿Hola? Aquí tu hormiga. Cuando quieras, seguimos. 🐜" },
    { id: "nt3", tone: L, text: "He guardado tus tareas en un sitio seguro. Vuelve cuando quieras." },
    { id: "nt4", tone: C, text: "Hace unos días que no te veo. Aquí estoy cuando quieras." },
    { id: "nt5", tone: C, text: "Sin prisa. Cuando vuelvas, empezamos por algo pequeño." },
  ],
  noti_logro: [
    { id: "nl1", tone: L, text: "¡Logro conseguido: {logro}! {xp}" },
    { id: "nl2", tone: C, text: "Has conseguido «{logro}». {xp}" },
  ],
  noti_reto: [
    { id: "nx1", tone: L, text: "¡Reto completado: {reto}! {xp}" },
    { id: "nx2", tone: C, text: "Reto completado: {reto}. {xp}" },
  ],
};

export type MessageVars = Partial<Record<
  "nombre" | "tareas" | "tarea" | "racha" | "habitos" | "vencidas" | "nivel" | "titulo" | "logro" | "reto" | "completadas" | "pendientes" | "xp",
  string | number | null
>>;

/** Sustituye las variables. Sin nombre, quita la coletilla («¡Hola, {nombre}!» → «¡Hola!»). */
export function renderMessage(text: string, vars: MessageVars): string {
  let out = text;
  if (!vars.nombre) out = out.replace(/,\s*\{nombre\}/g, "").replace(/\{nombre\}\s*/g, "");
  return out
    .replace(/\{(\w+)\}/g, (_, k: string) => {
      const v = vars[k as keyof MessageVars];
      return v == null ? "" : String(v);
    })
    .replace(/\s+([.,!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Variantes de una situación para un tono. */
export function variantsFor(situation: Situation, tone: Tone): Message[] {
  const all = MESSAGES[situation];
  const own = all.filter((m) => !m.tone || m.tone === tone);
  return own.length ? own : all;
}

/** Elige una variante que no esté entre las vistas hace poco (si se puede). */
export function pickMessage(
  situation: Situation,
  tone: Tone,
  recentIds: readonly string[],
  rand: () => number = Math.random,
): Message {
  const options = variantsFor(situation, tone);
  const fresh = options.filter((m) => !recentIds.includes(m.id));
  const pool = fresh.length ? fresh : options;
  return pool[Math.floor(rand() * pool.length) % pool.length];
}

/** «3 tareas», «1 hábito»… */
export function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
