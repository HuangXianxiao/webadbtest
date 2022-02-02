
import { AdbShell, encodeUtf8 } from "@yume-chan/adb";
import { AutoDisposable } from "@yume-chan/event";
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { WebglAddon } from 'xterm-addon-webgl';

export class AdbTerminal extends AutoDisposable {
    private element = document.createElement('div');

    public terminal: Terminal = new Terminal({
        scrollback: 9000,
    });

    public searchAddon = new SearchAddon();

    private readonly fitAddon = new FitAddon();

    private _shell: AdbShell | undefined;
    public get socket() { return this._shell; }
    public set socket(value) {
        if (this._shell) {
            // Remove event listeners
            this.dispose();
        }

        this._shell = value;

        if (value) {
            this.terminal.clear();
            this.terminal.reset();

            this.addDisposable(value.onStdout(data => {
                this.terminal.write(new Uint8Array(data));
            }));
            this.addDisposable(value.onStderr(data => {
                this.terminal.write(new Uint8Array(data));
            }));
            this.addDisposable(this.terminal.onData(data => {
                const buffer = encodeUtf8(data);
                value.write(buffer);
            }));

            this.fit();
        }
    }

    public constructor() {
        super();

        this.element.style.width = '100%';
        this.element.style.height = '100%';
        this.element.style.overflow = 'hidden';

        this.terminal.options.fontFamily = '"Cascadia Code", Consolas, monospace, "Source Han Sans SC", "Microsoft YaHei"';
        this.terminal.options.letterSpacing = 1;
        this.terminal.options.cursorStyle = 'bar';
        this.terminal.loadAddon(this.searchAddon);
        this.terminal.loadAddon(this.fitAddon);
    }

    public setContainer(container: HTMLDivElement) {
        container.appendChild(this.element);
        if (!this.terminal.element) {
            void this.element.offsetWidth;
            this.terminal.open(this.element);
            this.terminal.loadAddon(new WebglAddon());
            // WebGL renderer ignores `cursorBlink` set before it initialized
            this.terminal.options.cursorBlink = true;
            this.fit();
        }
    }

    public fit() {
        this.fitAddon.fit();
        // Resize remote terminal
        const { rows, cols } = this.terminal;
        this._shell?.resize(rows, cols);
    }
}
