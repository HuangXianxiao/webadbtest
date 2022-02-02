interface PickFileOptions {
    accept?: string;
}

export function pickFile(options: { multiple: true; } & PickFileOptions): Promise<FileList>;
export function pickFile(options: { multiple?: false; } & PickFileOptions): Promise<File | null>;
export function pickFile(options: { multiple?: boolean; } & PickFileOptions): Promise<FileList | File | null> {
    return new Promise<FileList | File | null>(resolve => {
        const input = document.createElement('input');
        input.type = 'file';

        if (options.multiple) {
            input.multiple = true;
        }

        if (options.accept) {
            input.accept = options.accept;
        }

        input.onchange = () => {
            if (options.multiple) {
                resolve(input.files!);
            } else {
                resolve(input.files!.item(0));
            }
        };

        input.click();
    });
}

export async function* chunkFile(file: File, chunkSize: number): AsyncGenerator<ArrayBuffer, void, void> {
    for (let i = 0; i < file.size; i += chunkSize) {
        yield file.slice(i, i + chunkSize, file.type).arrayBuffer();
    }
}
