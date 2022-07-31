import { ExcludeList } from "./types";

let excludeList = [];
let hashProxy = false;

export const getExcludeList = (): ExcludeList => excludeList;
export const setExcludeList = (x: ExcludeList) => (excludeList = x);

export const isHashProxy = () => hashProxy;
export const setIsHashProxy = (x: boolean) => (hashProxy = x);
