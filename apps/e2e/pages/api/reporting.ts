import { reporting } from "@next-safe/middleware/dist/api";

export default reporting(data => console.log(JSON.stringify(data)));
