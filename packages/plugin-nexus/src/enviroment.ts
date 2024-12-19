import { IAgentRuntime } from "@ai16z/eliza";
import { z } from "zod";

export const nexusEnvSchema = z.object({
    NXS_PRIVATE_KEY: z
        .string()
        .min(1, "Nexus wallet private key is required"),
    NXS_USERNAME: z
        .string()
        .min(1, "Nexus username is required"),
    NXS_PASSWORD: z
        .string()
        .min(1, "Nexus password is required"),
    NXS_PIN: z
        .string()
        .min(1, "Nexus pin is required"),
    NXS_SESSION: z
        .string()
        .min(1, "Nexus session is required"),
});

export type NexusConfig = z.infer<typeof nexusEnvSchema>;

export async function validateNexusConfig(
    runtime: IAgentRuntime
): Promise<NexusConfig> {
    try {
        const config = {
            NXS_PRIVATE_KEY:
                runtime.getSetting("NXS_PRIVATE_KEY") ||
                process.env.NXS_PRIVATE_KEY,
            NXS_USERNAME:
                runtime.getSetting("NXS_USERNAME") ||
                process.env.NXS_USERNAME,
            NXS_PASSWORD:
                runtime.getSetting("NXS_PASSWORD") ||
                process.env.NXS_PASSWORD,
            NXS_PIN:
                runtime.getSetting("NXS_PIN") ||
                process.env.NXS_PIN,
            NXS_SESSION:
                runtime.getSetting("NXS_SESSION") ||
                process.env.NXS_SESSION,
        };

        return nexusEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Nexus configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
