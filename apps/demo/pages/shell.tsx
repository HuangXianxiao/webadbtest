import { IconButton, SearchBox, Stack, StackItem } from '@fluentui/react';
import { reaction } from "mobx";
import { observer } from "mobx-react-lite";
import { NextPage } from "next";
import Head from "next/head";
import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import 'xterm/css/xterm.css';
import { globalState } from "../state";
import { Icons, ResizeObserver, RouteStackProps } from '../utils';

let terminal: import('../components/terminal').AdbTerminal;
if (typeof window !== 'undefined') {
    const AdbTerminal: typeof import('../components/terminal').AdbTerminal = require('../components/terminal').AdbTerminal;
    terminal = new AdbTerminal();
}

const ResizeObserverStyle: CSSProperties = {
    width: '100%',
    height: '100%',
};

const UpIconProps = { iconName: Icons.ChevronUp };
const DownIconProps = { iconName: Icons.ChevronDown };

const Shell: NextPage = (): JSX.Element | null => {
    const [searchKeyword, setSearchKeyword] = useState('');
    const handleSearchKeywordChange = useCallback((e, newValue?: string) => {
        setSearchKeyword(newValue ?? '');
        if (newValue) {
            terminal.searchAddon.findNext(newValue, { incremental: true });
        }
    }, []);
    const findPrevious = useCallback(() => {
        terminal.searchAddon.findPrevious(searchKeyword);
    }, [searchKeyword]);
    const findNext = useCallback(() => {
        terminal.searchAddon.findNext(searchKeyword);
    }, [searchKeyword]);

    const connectingRef = useRef(false);
    useEffect(() => {
        return reaction(
            () => globalState.device,
            async () => {
                if (!globalState.device) {
                    terminal.socket = undefined;
                    return;
                }

                if (!!terminal.socket || connectingRef.current) {
                    return;
                }

                try {
                    connectingRef.current = true;
                    const socket = await globalState.device.childProcess.shell();
                    terminal.socket = socket;
                } catch (e) {
                    globalState.showErrorDialog(e instanceof Error ? e.message : `${e}`);
                } finally {
                    connectingRef.current = false;
                }
            },
            {
                fireImmediately: true,
            }
        );
    }, []);

    const handleResize = useCallback(() => {
        terminal.fit();
    }, []);

    const handleContainerRef = useCallback((container: HTMLDivElement | null) => {
        if (container) {
            terminal.setContainer(container);
        }
    }, []);

    return (
        <Stack {...RouteStackProps}>
            <Head>
                <title>Screen Capture - WebADB</title>
            </Head>

            <StackItem>
                <Stack horizontal>
                    <StackItem grow>
                        <SearchBox
                            placeholder="Find"
                            value={searchKeyword}
                            onChange={handleSearchKeywordChange}
                            onSearch={findNext}
                        />
                    </StackItem>
                    <StackItem>
                        <IconButton
                            disabled={!searchKeyword}
                            iconProps={UpIconProps}
                            onClick={findPrevious}
                        />
                    </StackItem>
                    <StackItem>
                        <IconButton
                            disabled={!searchKeyword}
                            iconProps={DownIconProps}
                            onClick={findNext}
                        />
                    </StackItem>
                </Stack>
            </StackItem>

            <StackItem grow styles={{ root: { minHeight: 0 } }}>
                <ResizeObserver style={ResizeObserverStyle} onResize={handleResize}>
                    <div ref={handleContainerRef} style={{ height: '100%' }} />
                </ResizeObserver>
            </StackItem>
        </Stack>
    );
};

export default observer(Shell);
