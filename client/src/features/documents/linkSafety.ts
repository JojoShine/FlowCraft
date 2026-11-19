export function safeLinkUrl(href:string):boolean {
 try {const url=new URL(href,'https://flowcraft.invalid/');return ['https:','http:','mailto:','tel:'].includes(url.protocol);}catch {return false;}
}
