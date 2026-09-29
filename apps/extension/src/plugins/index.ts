import type { ContextProvider, EventSink } from "@instant-reply/core";

// Plug other apps in here. Nothing else in the extension needs to change.
//
// A context provider adds facts to a draft, for example the role and application
// status from a job app when the thread is with a recruiter:
//
//   const jobApp: ContextProvider = {
//     id: "job-app",
//     getContext: async (thread) => lookUpApplication(thread) ?? null,
//   };
//
// An event sink hears what the agent does ("thread-activated", "draft-created", ...),
// for example to move an application to "Interviewing" when a recruiter is answered.
//
// Both are allowed to fail or be slow: the agent skips them and still drafts.

export const contextProviders: ContextProvider[] = [];

export const eventSinks: EventSink[] = [];
