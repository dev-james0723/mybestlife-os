/**
 * Brain normalize — public surface.
 *
 * Each domain emits a list of `BrainNode`s. The relationship engine
 * consumes these flat lists and synthesizes edges; nothing here produces
 * edges directly.
 */

export * from "./_shared";
export * from "./knowledge";
export * from "./action";
export * from "./capture";
export * from "./people";
export * from "./career";
export * from "./resources";
export * from "./wellbeing";
