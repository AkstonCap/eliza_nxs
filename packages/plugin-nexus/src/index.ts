import { Plugin } from "@ai16z/eliza";
//import { createSession } from "./actions/createSession";
//import { createOrder } from "./actions/createOrder";

export const nexusPlugin: Plugin = {
    name: "nexus",
    description: "Nexus Plugin for Eliza",
    actions: [
        createSession,
        createOrder,
    ],
    evaluators: [],
    providers: [],
};

export default nexusPlugin;
