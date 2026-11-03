import { api } from "@/lib/api";
import { endpoint } from "@/lib/http";
export const GET = endpoint(api, false);
export const POST = endpoint(api);
export const DELETE = endpoint(api);
