export function downloadBlob(blob:Blob,fileName:string) {
 const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=fileName.replace(/[\x00-\x1f/\\]/g,'_');anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
