import { STEPS, type Step } from "../theme";

/** Frame en el que empieza un paso de la cascada de entrada. */
export const at = (step: Step, stagger: number) => STEPS[step] * stagger;
