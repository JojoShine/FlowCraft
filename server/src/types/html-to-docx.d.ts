declare module 'html-to-docx' {
  function htmlToDocx(html: string, options?: Record<string, unknown>): Promise<Buffer>;
  export default htmlToDocx;
}
