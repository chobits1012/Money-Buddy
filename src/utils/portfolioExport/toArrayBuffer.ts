/** 將 exceljs writeBuffer 等回傳值轉成可餵給 Blob／File 的 ArrayBuffer */
export function normalizeExcelWriteBuffer(buf: unknown): ArrayBuffer {
    if (buf instanceof ArrayBuffer) {
        return buf;
    }
    if (typeof SharedArrayBuffer !== 'undefined' && buf instanceof SharedArrayBuffer) {
        return new Uint8Array(buf).slice().buffer;
    }
    if (ArrayBuffer.isView(buf)) {
        const v = buf as ArrayBufferView;
        return new Uint8Array(v.buffer, v.byteOffset, v.byteLength).slice().buffer;
    }
    return new Uint8Array(buf as ArrayLike<number>).buffer;
}
