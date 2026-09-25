import { useEffect } from 'react';
export function useKeyboardShortcuts(onCommandPalette:()=>void){ useEffect(()=>{const handler=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();onCommandPalette();}}; window.addEventListener('keydown',handler); return()=>window.removeEventListener('keydown',handler);},[onCommandPalette]); }
