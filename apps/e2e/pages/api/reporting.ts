import { reportingHandler } from "@next-safe/middleware/dist/api";

export default reportingHandler(data => console.log(JSON.stringify(data)));
