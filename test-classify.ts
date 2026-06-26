import { classify } from "./src/agents/investigator.js"; classify({ ticket_id: "test", complaint: "What is 2+2?" }).then(console.log).catch(console.error);
